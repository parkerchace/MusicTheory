/**
 * Tutorial System - Easy Mode and Demo Mode for learning
 */
(function() {
    'use strict';
    
    const tutorialSteps = [
        {
            title: 'Welcome to Music Theory Studio',
            content: 'This tool helps you learn music theory step by step. Let\'s start with the basics: scales are collections of notes that sound good together.',
            target: '#scale-library-container',
            action: null
        },
        {
            title: 'Step 1: Choose Your Scale',
            content: 'Start with C Major - the simplest scale with no sharps or flats. Click the dropdown and select "C Major" to begin.',
            target: '#scale-library-container',
            action: () => {}
        },
        {
            title: 'Step 2: See the Notes',
            content: 'Look at the Circle of Fifths on the left. The highlighted notes show which notes are in your chosen scale. C Major has: C, D, E, F, G, A, B.',
            target: '#scale-circle-container',
            action: null
        },
        {
            title: 'Step 3: Generate Numbers',
            content: 'Music uses numbers (degrees) to represent scale positions. Try the Number Generator to create a simple melody pattern like "1-3-5-1".',
            target: '#number-generator-container',
            action: null
        },
        {
            title: 'Step 4: Build Chords',
            content: 'Chords are multiple notes played together. The Sheet Music area shows chords built from your scale. These are the building blocks of harmony.',
            target: '[data-module="score"]',
            action: null
        },
        {
            title: 'Step 5: Play It',
            content: 'Click on the piano keys below to hear your scale and chords. The highlighted keys show which notes belong to your current scale.',
            target: '#piano-container',
            action: null
        },
        {
            title: 'Step 6: Explore Progressions',
            content: 'Try the manual input box at the top. Type chord numbers like "1 4 5 1" to create a classic chord progression. Press Enter to hear it!',
            target: '#global-manual-numbers',
            action: null
        },
        {
            title: 'You\'re Ready!',
            content: 'Now you understand the basics! Enable Demo Mode (button at top) to see explanations when you hover over any tool. Happy composing!',
            target: '#demo-mode-btn',
            action: null
        }
    ];
    
    const demoTooltips = {
        '#scale-library-container': {
            title: 'Scale Selector',
            content: 'Choose from hundreds of scales across different musical traditions. Each scale has a unique character and emotional quality.'
        },
        '#scale-circle-container': {
            title: 'Circle of Fifths',
            content: 'Visual reference showing all 12 notes. Highlighted notes belong to your current scale. Adjacent scales are closely related.'
        },
        '#number-generator-container': {
            title: 'Number Generator',
            content: 'Create melodies and progressions using scale degrees. Use patterns, random generation, or manual input to explore musical ideas.'
        },
        '#container-chord-container': {
            title: 'Container Chord Tool',
            content: 'Find what scales contain specific chords. Great for understanding chord-scale relationships and harmonic possibilities.'
        },
        '[data-module="score"]': {
            title: 'Sheet Music Generator',
            content: 'Visual notation of your progression. Shows chord symbols, staff notation, and harmonic analysis. Export as MIDI for your DAW.'
        },
        '[data-module="chord"]': {
            title: 'Chord Explorer',
            content: 'Interactive map of all diatonic chords in your scale. Click to hear, see voice leadings, and understand functional harmony.'
        },
        '#piano-container': {
            title: 'Piano Visualizer',
            content: 'Click keys to play notes and chords. Highlighted keys show your current scale. Visual feedback helps connect theory to sound.'
        },
        '#global-manual-numbers': {
            title: 'Manual Chord Input',
            content: 'Type chord progressions directly: "1 4 5 1" or "Cmaj7 Fmaj7". Supports Roman numerals, numbers, and chord symbols.'
        },
        '#global-grading-type': {
            title: 'Grading View',
            content: 'Change how chords are colored: Functional (tonic/dominant), Emotional (happy/sad), or Color (synesthesia-inspired).'
        },
        '#theme-switcher': {
            title: 'Theme Switcher',
            content: 'Cycle through visual themes: Clean DAW, Channel Strip, Matrix FX, or Steam 2000. Find your preferred workspace aesthetic.'
        },
        '#toggle-layout': {
            title: 'Layout Toggle',
            content: 'Switch between column layout and grid layout. Grid mode lets you drag-and-drop modules to customize your workspace.'
        },
        '.module-toggle-item': {
            title: 'Module Visibility',
            content: 'Show or hide individual modules. Customize your workspace to focus on the tools you\'re currently using.'
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
        
        if (step.target) {
            const target = document.querySelector(step.target);
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
    
    // First-time visitor prompt
    const hasVisited = localStorage.getItem('music-theory-visited');
    if (!hasVisited) {
        setTimeout(() => {
            if (confirm('Welcome! Would you like a guided tour to learn the basics?')) {
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
            localStorage.setItem('music-theory-visited', 'true');
        }, 1000);
    }
})();
