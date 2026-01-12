/**
 * Lexical Music Engine Integration
 * Handles word-to-music translation, analysis panel, and session logging
 */
(function() {
    'use strict';
    
    // Initialize simple word engine
    let lexicalEngine = null;
    let lexicalWeights = {
        emotional: 0.30,
        syllabic: 0.20,
        phonetic: 0.15,
        semantic: 0.25,
        archetype: 0.10
    };
    let lexicalSettings = {
        aggressiveMapping: false,
        keyVariety: true,
        autoSend: true
    };
    
    // Global undo/redo history
    let globalHistory = [];
    let globalHistoryIndex = -1;
    const MAX_HISTORY = 50;

    // Wait for MusicTheoryEngine to be ready
    function initLexicalSystem() {
        if (typeof MusicTheoryEngine === 'undefined' || typeof SimpleWordEngine === 'undefined') {
            console.warn('[LexicalIntegration] Waiting for engine classes...');
            setTimeout(initLexicalSystem, 100);
            return;
        }
        
        try {
            const musicTheory = new MusicTheoryEngine();
            lexicalEngine = new SimpleWordEngine(musicTheory);
            lexicalEngine.debug = true;
            
            console.log('[LexicalIntegration] ✅ SIMPLE WORD ENGINE INITIALIZED');
        } catch (err) {
            console.error('[LexicalIntegration] Initialization failed:', err);
        }
    }
    
    setTimeout(initLexicalSystem, 500);

    // Input mode toggle
    const inputModeWords = document.getElementById('input-mode-words');
    const inputModeNumbers = document.getElementById('input-mode-numbers');
    const globalWordInput = document.getElementById('global-word-input');
    const globalManualNumbers = document.getElementById('global-manual-numbers');

    if (inputModeWords && inputModeNumbers && globalWordInput && globalManualNumbers) {
        inputModeWords.addEventListener('click', () => {
            inputModeWords.classList.add('active');
            inputModeNumbers.classList.remove('active');
            globalWordInput.style.display = '';
            globalManualNumbers.style.display = 'none';
        });

        inputModeNumbers.addEventListener('click', () => {
            inputModeNumbers.classList.add('active');
            inputModeWords.classList.remove('active');
            globalManualNumbers.style.display = '';
            globalWordInput.style.display = 'none';
        });
    }

    // Word settings panel toggle
    const wordSettingsBtn = document.getElementById('word-settings-btn');
    const wordSettingsPanel = document.getElementById('word-settings-panel');
    
    if (wordSettingsBtn && wordSettingsPanel) {
        wordSettingsBtn.addEventListener('click', () => {
            wordSettingsPanel.classList.toggle('active');
            const analysisPanel = document.getElementById('word-analysis-panel');
            if (analysisPanel) analysisPanel.classList.remove('active');
        });
    }

    // Weight sliders
    const weightSliders = {
        emotional: document.getElementById('weight-emotional'),
        syllabic: document.getElementById('weight-syllabic'),
        phonetic: document.getElementById('weight-phonetic'),
        semantic: document.getElementById('weight-semantic'),
        archetype: document.getElementById('weight-archetype')
    };

    Object.keys(weightSliders).forEach(key => {
        const slider = weightSliders[key];
        if (slider) {
            const currentWeight = lexicalWeights[key] || 0;
            const sliderValue = Math.round(currentWeight * 100);
            slider.value = sliderValue;
            
            const valueDisplay = slider.nextElementSibling;
            if (valueDisplay) valueDisplay.textContent = sliderValue + '%';
            
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (valueDisplay) valueDisplay.textContent = value + '%';
                lexicalWeights[key] = value / 100;
            });
        }
    });

    // Reset weights button
    const resetWeightsBtn = document.getElementById('reset-weights-btn');
    if (resetWeightsBtn) {
        resetWeightsBtn.addEventListener('click', () => {
            const defaults = { emotional: 30, syllabic: 20, phonetic: 15, semantic: 25, archetype: 10 };
            Object.keys(defaults).forEach(key => {
                const slider = weightSliders[key];
                if (slider) {
                    slider.value = defaults[key];
                    const valueDisplay = slider.nextElementSibling;
                    if (valueDisplay) valueDisplay.textContent = defaults[key] + '%';
                    lexicalWeights[key] = defaults[key] / 100;
                }
            });
        });
    }
    
    // Copy Lexical Log button
    const copyLexicalLogBtn = document.getElementById('copy-lexical-log-btn');
    if (copyLexicalLogBtn) {
        copyLexicalLogBtn.addEventListener('click', () => {
            copyLexicalLogToClipboard();
        });
    }

    // Debug Log button
    const debugLogBtn = document.getElementById('debug-log-btn');
    if (debugLogBtn) {
        debugLogBtn.addEventListener('click', () => {
            showDebugLog();
        });
    }

    // Export / Clear session log buttons
    const exportLexicalLogBtn = document.getElementById('export-lexical-log-btn');
    if (exportLexicalLogBtn) {
        exportLexicalLogBtn.addEventListener('click', () => exportLexicalLog());
    }
    const clearLexicalLogBtn = document.getElementById('clear-lexical-log-btn');
    if (clearLexicalLogBtn) {
        clearLexicalLogBtn.addEventListener('click', () => {
            if (!confirm('Clear lexical session log?')) return;
            window.__lexicalLog = [];
            try { renderLexicalLog(); } catch(_) {}
        });
    }
    
    // Randomize button
    const randomizeBtn = document.getElementById('word-randomize-btn');
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', () => {
            let remaining = 100;
            const keys = Object.keys(lexicalWeights);
            const randomWeights = {};
            
            keys.forEach((key, idx) => {
                if (idx === keys.length - 1) {
                    randomWeights[key] = remaining;
                } else {
                    const value = Math.floor(Math.random() * 36) + 5;
                    randomWeights[key] = Math.min(value, remaining - (keys.length - idx - 1) * 5);
                    remaining -= randomWeights[key];
                }
            });
            
            Object.keys(randomWeights).forEach(key => {
                const slider = weightSliders[key];
                if (slider) {
                    slider.value = randomWeights[key];
                    const valueDisplay = slider.nextElementSibling;
                    if (valueDisplay) valueDisplay.textContent = randomWeights[key] + '%';
                    lexicalWeights[key] = randomWeights[key] / 100;
                }
            });
            
            if (globalWordInput && globalWordInput.value.trim()) {
                processWordsInput(globalWordInput.value.trim());
            }
        });
    }

    // Aggressive mapping checkbox
    const aggressiveCheckbox = document.getElementById('weight-aggressive');
    if (aggressiveCheckbox) {
        aggressiveCheckbox.addEventListener('change', (e) => {
            lexicalSettings.aggressiveMapping = !!e.target.checked;
        });
    }

    // Key variety checkbox
    const keyVarietyCheckbox = document.getElementById('weight-key-variety');
    if (keyVarietyCheckbox) {
        keyVarietyCheckbox.addEventListener('change', (e) => {
            lexicalSettings.keyVariety = !!e.target.checked;
        });
    }
    
    // Auto-send checkbox
    const autoSendCheckbox = document.getElementById('weight-auto-send');
    if (autoSendCheckbox) {
        autoSendCheckbox.addEventListener('change', (e) => {
            lexicalSettings.autoSend = !!e.target.checked;
        });
    }

    // Regenerate button
    const regenerateBtn = document.getElementById('word-regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            if (!globalWordInput || !globalWordInput.value.trim()) return;
            processWordsInput(globalWordInput.value.trim());
        });
    }

    // Send to Sheet button
    const sendSheetBtn = document.getElementById('word-send-sheet-btn');
    if (sendSheetBtn) {
        sendSheetBtn.addEventListener('click', () => {
            const last = window.__lastLexicalResult;
            if (!last) {
                alert('No translation result available. Please generate one first.');
                return;
            }
            try {
                updateNumberGenerator(last);
                const toast = document.createElement('div');
                toast.textContent = 'Sent to Sheet Music';
                toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:8px 12px;border-radius:4px;font-size:13px;z-index:10000;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1500);
            } catch (e) {
                console.error('[LexicalIntegration] Send to sheet failed', e);
                alert('Failed to send to sheet. See console.');
            }
        });
    }

    // Word input processing
    let wordInputTimeout = null;
    let isUserDismissingPanel = false;
    let lastEnterTime = 0;
    
    if (globalWordInput) {
        if (globalWordInput._inputHandler) {
            globalWordInput.removeEventListener('input', globalWordInput._inputHandler);
        }
        if (globalWordInput._keydownHandler) {
            globalWordInput.removeEventListener('keydown', globalWordInput._keydownHandler);
        }
        if (globalWordInput._blurHandler) {
            globalWordInput.removeEventListener('blur', globalWordInput._blurHandler);
        }
        
        globalWordInput._inputHandler = (e) => {
            const words = e.target.value.trim();
            if (!words) {
                const analysisContent = document.getElementById('word-analysis-content');
                if (analysisContent) {
                    analysisContent.innerHTML = '<div class="analysis-empty">Enter words above to see analysis...</div>';
                }
            }
        };
        globalWordInput.addEventListener('input', globalWordInput._inputHandler);
        
        globalWordInput._keydownHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(wordInputTimeout);
                const words = e.target.value.trim();
                if (words) {
                    lastEnterTime = Date.now();
                    isUserDismissingPanel = false;
                    processWordsInput(words);
                }
            }
        };
        globalWordInput.addEventListener('keydown', globalWordInput._keydownHandler);
        
        globalWordInput._blurHandler = (e) => {
            isUserDismissingPanel = true;
        };
        globalWordInput.addEventListener('blur', globalWordInput._blurHandler);
    }

    /**
     * Global Undo/Redo System
     */
    function captureGlobalState() {
        try {
            return {
                timestamp: Date.now(),
                lexicalResult: window.__lastLexicalResult ? JSON.parse(JSON.stringify(window.__lastLexicalResult)) : null,
                wordInput: globalWordInput ? globalWordInput.value : '',
                weights: { ...lexicalWeights },
                settings: { ...lexicalSettings }
            };
        } catch (e) {
            return null;
        }
    }
    
    function saveToHistory() {
        const state = captureGlobalState();
        if (!state) return;
        
        if (globalHistoryIndex < globalHistory.length - 1) {
            globalHistory = globalHistory.slice(0, globalHistoryIndex + 1);
        }
        
        globalHistory.push(state);
        if (globalHistory.length > MAX_HISTORY) {
            globalHistory.shift();
        } else {
            globalHistoryIndex++;
        }
        
        updateUndoRedoButtons();
    }
    
    function restoreState(state) {
        if (!state) return;
        
        try {
            if (globalWordInput && state.wordInput !== undefined) {
                globalWordInput.value = state.wordInput;
            }
            
            if (state.weights) {
                Object.assign(lexicalWeights, state.weights);
                Object.keys(weightSliders).forEach(key => {
                    const slider = weightSliders[key];
                    if (slider && state.weights[key] !== undefined) {
                        slider.value = Math.round(state.weights[key] * 100);
                        const valueDisplay = slider.nextElementSibling;
                        if (valueDisplay) valueDisplay.textContent = Math.round(state.weights[key] * 100) + '%';
                    }
                });
            }
            
            if (state.settings) {
                Object.assign(lexicalSettings, state.settings);
            }
            
            if (state.lexicalResult) {
                window.__lastLexicalResult = state.lexicalResult;
                updateAnalysisPanel(state.lexicalResult);
                if (lexicalSettings.autoSend) {
                    updateNumberGenerator(state.lexicalResult);
                }
            }
        } catch (e) {
            console.error('[Undo/Redo] Failed to restore state:', e);
        }
    }
    
    function globalUndo() {
        if (globalHistoryIndex <= 0) return;
        globalHistoryIndex--;
        restoreState(globalHistory[globalHistoryIndex]);
        updateUndoRedoButtons();
        showToast('↶ Undo', '#64C8FF');
    }
    
    function globalRedo() {
        if (globalHistoryIndex >= globalHistory.length - 1) return;
        globalHistoryIndex++;
        restoreState(globalHistory[globalHistoryIndex]);
        updateUndoRedoButtons();
        showToast('↷ Redo', '#10b981');
    }
    
    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('global-undo-btn');
        const redoBtn = document.getElementById('global-redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = globalHistoryIndex <= 0;
            undoBtn.style.opacity = globalHistoryIndex <= 0 ? '0.3' : '1';
        }
        
        if (redoBtn) {
            redoBtn.disabled = globalHistoryIndex >= globalHistory.length - 1;
            redoBtn.style.opacity = globalHistoryIndex >= globalHistory.length - 1 ? '0.3' : '1';
        }
    }
    
    function showToast(message, color = '#64C8FF') {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${color};color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:700;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    }
    
    // Wire up undo/redo buttons
    const undoBtn = document.getElementById('global-undo-btn');
    const redoBtn = document.getElementById('global-redo-btn');
    if (undoBtn) undoBtn.addEventListener('click', globalUndo);
    if (redoBtn) redoBtn.addEventListener('click', globalRedo);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            globalUndo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            globalRedo();
        }
    });

    function copyLexicalLogToClipboard() {
        try {
            const logText = buildCompactLexicalLog();
            navigator.clipboard.writeText(logText).then(() => {
                const toast = document.createElement('div');
                toast.textContent = 'Lexical log copied';
                toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#64C8FF;color:#000;padding:12px 20px;border-radius:4px;font-size:14px;z-index:10000;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            });
        } catch (e) {
            alert('Failed to build log. See console.');
        }
    }
    
    function buildCompactLexicalLog() {
        if (!window.__lexicalLog || window.__lexicalLog.length === 0) {
            return '[Lexical] No translations logged yet.';
        }
        
        const lines = [];
        lines.push('[Lexical Analysis Log]');
        lines.push('='.repeat(60));
        lines.push('');
        
        window.__lexicalLog.forEach((entry, idx) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            lines.push(`#${idx + 1} [${time}] "${entry.input}"`);
            
            if (entry.result.scale) {
                const scaleStr = typeof entry.result.scale === 'object' 
                    ? `${entry.result.scale.root || entry.result.scale.key} ${entry.result.scale.name || entry.result.scale.scale}`
                    : entry.result.scale;
                lines.push(`  Scale: ${scaleStr}`);
            }
            
            if (entry.result.progression && entry.result.progression.length > 0) {
                const progStr = entry.result.progression.map(c => {
                    const name = c.fullName || c;
                    const degree = c.degree ? ` (${c.degree})` : '';
                    const func = c.function ? ` [${c.function}]` : '';
                    const tier = c.tier ? ` T${c.tier}` : '';
                    return name + degree + func + tier;
                }).join(' → ');
                lines.push(`  Progression: ${progStr}`);
            }
            
            if (entry.result.complexity) {
                const cplx = entry.result.complexity;
                if (typeof cplx === 'object') {
                    lines.push(`  Complexity: H=${Math.round(cplx.harmonic*100)}% R=${Math.round(cplx.rhythmic*100)}% E=${Math.round(cplx.emotional*100)}% (${cplx.overall})`);
                } else {
                    lines.push(`  Complexity: ${cplx}`);
                }
            }
            
            if (entry.result.reasoning) {
                lines.push(`  Reasoning: ${entry.result.reasoning}`);
            }
            
            if (entry.weights) {
                const w = entry.weights;
                lines.push(`  Weights: Emotional=${w.emotional}% Semantic=${w.semantic}% Phonetic=${w.phonetic}% Arch=${w.archetype}%`);
            }
            
            lines.push('');
        });
        
        lines.push('='.repeat(60));
        lines.push(`Total translations: ${window.__lexicalLog.length}`);
        
        return lines.join('\n');
    }

    function renderLexicalLog() {
        const list = document.getElementById('lexical-log-list');
        if (!list) return;
        list.innerHTML = '';
        if (!window.__lexicalLog || window.__lexicalLog.length === 0) {
            list.innerHTML = '<div style="color:#999; font-size:12px; padding:6px;">No translations logged yet.</div>';
            return;
        }

        window.__lexicalLog.slice().reverse().forEach((entry, revIdx) => {
            const idx = window.__lexicalLog.length - 1 - revIdx;
            const item = document.createElement('div');
            item.style.padding = '8px';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';

            const left = document.createElement('div');
            left.style.flex = '1';
            left.innerHTML = `<div style="font-size:12px; color:var(--text-highlight); font-weight:600;">${entry.input}</div>` +
                `<div style="font-size:11px; color:#aaa; margin-top:4px;">${(entry.result.scale && (entry.result.scale.root || entry.result.scale.key) ? (entry.result.scale.root || entry.result.scale.key) + ' ' + (entry.result.scale.name || entry.result.scale.scale || '') : '')} ${entry.result.progression && entry.result.progression.length ? '· ' + entry.result.progression.map(c=>c.fullName||c).join(' → ') : ''}</div>`;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '6px';

            const sendBtn = document.createElement('button');
            sendBtn.className = 'btn';
            sendBtn.style.fontSize = '0.75rem';
            sendBtn.textContent = 'Send';
            sendBtn.onclick = () => sendLogEntry(idx);

            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn';
            exportBtn.style.fontSize = '0.75rem';
            exportBtn.textContent = 'Export';
            exportBtn.onclick = () => exportLogEntry(idx);

            actions.appendChild(sendBtn);
            actions.appendChild(exportBtn);

            item.appendChild(left);
            item.appendChild(actions);
            list.appendChild(item);
        });
    }

    function sendLogEntry(index) {
        if (!window.__lexicalLog || !window.__lexicalLog[index]) {
            alert('Log entry not found');
            return;
        }
        const entry = window.__lexicalLog[index];
        const res = {
            scale: entry.result.scale,
            progression: entry.result.progression
        };
        try {
            window.__lastLexicalResult = res;
            updateNumberGenerator(res);
            alert('Sent translation to sheet');
        } catch (err) {
            alert('Failed to send to sheet. See console.');
        }
    }

    function exportLexicalLog() {
        if (!window.__lexicalLog || window.__lexicalLog.length === 0) {
            alert('No lexical log to export');
            return;
        }
        
        const exportData = {
            format: 'JSON',
            version: '1.0',
            timestamp: new Date().toISOString(),
            gradingMetadata: {
                mode: window.musicEngine ? window.musicEngine.gradingMode : 'functional',
                preservationLevel: 'full',
                exportType: 'lexical-log'
            },
            data: {
                lexicalLog: window.__lexicalLog
            },
            metadata: {
                totalEntries: window.__lexicalLog.length,
                exportedAt: new Date().toISOString()
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexical-log-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function showDebugLog() {
        let debugInfo = [];
        
        debugInfo.push('=== SCALE INTELLIGENCE ENGINE DEBUG ===');
        debugInfo.push(`ScaleIntelligenceEngine defined: ${typeof ScaleIntelligenceEngine !== 'undefined' ? '✅ YES' : '❌ NO'}`);
        
        if (typeof ScaleIntelligenceEngine !== 'undefined') {
            try {
                const testEngine = new ScaleIntelligenceEngine();
                debugInfo.push(`ScaleIntelligenceEngine creation: ✅ SUCCESS`);
                debugInfo.push(`Scale database size: ${Object.keys(testEngine.scaleDatabase || {}).length} scales`);
            } catch (error) {
                debugInfo.push(`ScaleIntelligenceEngine creation: ❌ FAILED - ${error.message}`);
            }
        }
        
        debugInfo.push('');
        debugInfo.push('=== SIMPLE WORD ENGINE DEBUG ===');
        debugInfo.push(`lexicalEngine defined: ${lexicalEngine ? '✅ YES' : '❌ NO'}`);
        
        if (lexicalEngine) {
            debugInfo.push(`Engine type: ${lexicalEngine.constructor.name}`);
            debugInfo.push(`Scale Intelligence available: ${lexicalEngine.scaleIntelligence ? '✅ YES' : '❌ NO'}`);
            debugInfo.push(`Debug mode: ${lexicalEngine.debug ? '✅ ON' : '❌ OFF'}`);
        }
        
        debugInfo.push('');
        debugInfo.push('=== RECENT TRANSLATIONS ===');
        if (window.__lexicalLog && window.__lexicalLog.length > 0) {
            const recent = window.__lexicalLog.slice(-3);
            recent.forEach((entry, i) => {
                debugInfo.push(`${i + 1}. "${entry.input}" → ${entry.result?.scale?.root || 'unknown'} ${entry.result?.scale?.name || 'unknown'}`);
            });
        } else {
            debugInfo.push('No translations logged yet');
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #1a1a1a; border: 2px solid var(--accent-primary);
            padding: 20px; border-radius: 8px; z-index: 10000;
            max-width: 600px; max-height: 80vh; overflow: auto;
            font-family: monospace; font-size: 12px; color: #fff;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: var(--accent-primary);">🔍 Debug Information</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">✕</button>
            </div>
            <pre style="margin: 0; white-space: pre-wrap; line-height: 1.4;">${debugInfo.join('\n')}</pre>
        `;
        
        document.body.appendChild(modal);
    }

    function exportLogEntry(index) {
        if (!window.__lexicalLog || !window.__lexicalLog[index]) {
            alert('Log entry not found');
            return;
        }
        const entry = window.__lexicalLog[index];
        const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexical-entry-${index + 1}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Prevent rapid successive calls
    let lastProcessTime = 0;
    let lastProcessWords = '';
    let isProcessing = false;
    let globalProcessingBlock = false;
    
    async function processWordsInput(words) {
        const now = Date.now();
        
        if (words === lastProcessWords && (now - lastProcessTime) < 500) {
            return;
        }
        
        if (isProcessing || globalProcessingBlock) {
            return;
        }
        
        isProcessing = true;
        globalProcessingBlock = true;
        lastProcessTime = now;
        lastProcessWords = words;
        
        setTimeout(() => {
            globalProcessingBlock = false;
        }, 1000);
        
        if (!lexicalEngine) {
            console.warn('[LexicalIntegration] Engine not initialized');
            isProcessing = false;
            return;
        }

        try {
            const result = await lexicalEngine.translateWords(words, { 
                weights: lexicalWeights, 
                aggressive: lexicalSettings.aggressiveMapping,
                dynamicKeys: lexicalSettings.keyVariety 
            });

            try { window.__lastLexicalResult = result; } catch(_) {}
            
            if (!window.__lexicalLog) window.__lexicalLog = [];
            window.__lexicalLog.push({
                type: 'translateWords',
                timestamp: new Date().toISOString(),
                input: words,
                weights: { ...lexicalWeights },
                result: {
                    scale: result.scale,
                    progression: result.progression ? result.progression.map(c => ({
                        fullName: c.fullName || c,
                        degree: c.degree,
                        function: c.function,
                        tier: c.tier
                    })) : [],
                    complexity: result.complexity,
                    reasoning: result.reasoning ? result.reasoning.summary : null
                }
            });
            if (window.__lexicalLog.length > 50) window.__lexicalLog.shift();
            try { renderLexicalLog(); } catch(_) {}

            updateAnalysisPanel(result);

            if (result.progression && result.progression.length > 0) {
                if (lexicalSettings.autoSend) {
                    updateNumberGenerator(result);
                }
            }
            
            saveToHistory();

        } catch (err) {
            console.error('[LexicalIntegration] Translation error:', err);
        } finally {
            isProcessing = false;
        }
    }

    function updateAnalysisPanel(result) {
        const analysisContent = document.getElementById('word-analysis-content');
        const analysisPanel = document.getElementById('word-analysis-panel');
        
        if (!analysisContent || !result) return;

        let html = '';

        // Current weights display
        html += `
            <div class="analysis-section" style="background: rgba(147,51,234,0.15); border-left: 3px solid #9333ea;">
                <div class="analysis-section-title">⚖️ CURRENT WEIGHTS</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Emotional:</span><span style="font-weight: bold; color: #64C8FF;">${Math.round((lexicalWeights.emotional || 0) * 100)}%</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Semantic:</span><span style="font-weight: bold; color: #10b981;">${Math.round((lexicalWeights.semantic || 0) * 100)}%</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Phonetic:</span><span style="font-weight: bold; color: #f59e0b;">${Math.round((lexicalWeights.phonetic || 0) * 100)}%</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Syllabic:</span><span style="font-weight: bold; color: #8b5cf6;">${Math.round((lexicalWeights.syllabic || 0) * 100)}%</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Archetype:</span><span style="font-weight: bold; color: #ec4899;">${Math.round((lexicalWeights.archetype || 0) * 100)}%</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: #aaa;">Aggressive:</span><span style="font-weight: bold; color: ${lexicalSettings.aggressiveMapping ? '#ef4444' : '#666'};">${lexicalSettings.aggressiveMapping ? 'ON' : 'OFF'}</span></div>
                </div>
            </div>
        `;

        // Reasoning section
        if (result.reasoning) {
            html += `
                <div class="analysis-section" style="background: rgba(100,200,255,0.1); border-left: 3px solid #64C8FF;">
                    <div class="analysis-section-title">💡 REASONING</div>
                    <div class="analysis-item" style="font-size: 13px; line-height: 1.6;">${result.reasoning.summary}</div>
                </div>
            `;
        }

        // Scale section
        if (result.scale) {
            html += `
                <div class="analysis-section">
                    <div class="analysis-section-title">🎵 Scale Suggestion</div>
                    <div class="analysis-item"><span class="analysis-item-label">Key:</span><span class="analysis-item-value">${result.scale.root || result.scale.key || 'C'}</span></div>
                    <div class="analysis-item"><span class="analysis-item-label">Scale:</span><span class="analysis-item-value">${result.scale.name || result.scale.scale || 'major'}</span></div>
                </div>
            `;
        }

        // Progression section
        if (result.progression && result.progression.length > 0) {
            html += `<div class="analysis-section"><div class="analysis-section-title">🎹 Chord Progression</div>`;
            
            result.progression.forEach((chord) => {
                const tierColor = chord.tierInfo ? chord.tierInfo.color : '#666';
                let chordName = typeof chord === 'string' ? chord : (chord.fullName || (chord.root + (chord.chordType || '')));
                
                html += `<div class="analysis-item" style="border-left: 3px solid ${tierColor}; padding-left: 8px; margin-bottom: 8px;">
                    <span class="analysis-item-value" style="font-weight: 500;">${chordName}</span>`;
                
                if (chord.function && chord.tier) {
                    html += `<div style="font-size: 11px; color: #aaa; margin-top: 2px;">${chord.function}, Tier ${chord.tier}</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }

        // Complexity section
        if (result.complexity) {
            const isNumeric = typeof result.complexity === 'object' && result.complexity.harmonic !== undefined;
            if (isNumeric) {
                html += `
                    <div class="analysis-section">
                        <div class="analysis-section-title">⚙️ Complexity</div>
                        <div class="analysis-item"><span class="analysis-item-label">Harmonic:</span><span class="analysis-item-value">${Math.round(result.complexity.harmonic * 100)}%</span></div>
                        <div class="analysis-item"><span class="analysis-item-label">Rhythmic:</span><span class="analysis-item-value">${Math.round(result.complexity.rhythmic * 100)}%</span></div>
                        <div class="analysis-item"><span class="analysis-item-label">Emotional:</span><span class="analysis-item-value">${Math.round(result.complexity.emotional * 100)}%</span></div>
                        <div class="analysis-item"><span class="analysis-item-label">Overall:</span><span class="analysis-item-value">${result.complexity.overall || 'moderate'}</span></div>
                    </div>
                `;
            }
        }

        // Archetype matches
        if (result.archetypeMatch) {
            html += `
                <div class="analysis-section">
                    <div class="analysis-section-title">🎭 Archetype Match</div>
                    <div class="archetype-match">
                        <div class="archetype-match-title">${result.archetypeMatch.name}</div>
                    </div>
                </div>
            `;
        }

        analysisContent.innerHTML = html || '<div class="analysis-empty">No analysis data available</div>';
        
        if (html && analysisPanel && !isUserDismissingPanel) {
            analysisPanel.classList.add('active');
        }
    }

    function updateNumberGenerator(result) {
        if (!result.scale || !result.progression) return;

        try {
            const numGen = window.numberGenerator;
            if (!numGen) return;

            const scaleKey = result.scale.root || result.scale.key || 'C';
            const scaleName = result.scale.name || result.scale.scale || 'major';
            
            if (window.scaleLibrary) {
                window.scaleLibrary.setKeyAndScale(scaleKey, scaleName);
            }
            
            const chordTokens = result.progression.map(chord => {
                if (typeof chord === 'string') return chord;
                if (chord.fullName) return chord.fullName;
                if (chord.root && chord.chordType !== undefined) return chord.root + chord.chordType;
                return String(chord);
            });
            
            if (window.globalManualNumbers) {
                window.globalManualNumbers.value = chordTokens.join(' ');
            }
            
            if (typeof numGen.setDisplayTokens === 'function') {
                numGen.setDisplayTokens(chordTokens, { 
                    rawTokens: chordTokens,
                    render: true,
                    emit: true
                });
                showToast('🎼 Sent to sheet music', '#10b981');
            }

        } catch (err) {
            console.error('[LexicalIntegration] Error updating NumberGenerator:', err);
        }
    }

})();
