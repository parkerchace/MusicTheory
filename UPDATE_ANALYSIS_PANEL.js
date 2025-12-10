// REPLACE THE EXISTING updateAnalysisPanel() function in modular-music-theory.html
// with this improved version that shows reasoning and tier info

function updateAnalysisPanel(result) {
    const analysisPanel = document.querySelector('.analysis-panel');
    if (!analysisPanel) return;
    
    // Create comprehensive display with reasoning
    let html = '<div class="lexical-analysis">';
    
    // REASONING SECTION (NEW!)
    if (result.reasoning) {
        html += '<div class="reasoning-section" style="background: rgba(100,200,255,0.1); border-left: 3px solid #64C8FF; padding: 12px; margin-bottom: 16px; border-radius: 4px;">';
        html += '<div style="font-weight: bold; color: #64C8FF; margin-bottom: 8px;">💡 REASONING</div>';
        html += `<div style="font-size: 13px; line-height: 1.6;">${result.reasoning.summary}</div>`;
        html += '</div>';
    }
    
    // SCALE INFO
    html += '<div class="scale-info" style="margin-bottom: 16px;">';
    html += `<div style="font-weight: bold; color: #FFD700; margin-bottom: 6px;">🎵 SCALE</div>`;
    html += `<div style="font-size: 16px; font-weight: 500; margin-bottom: 4px;">${result.scale}</div>`;
    if (result.reasoning && result.reasoning.scaleChoice) {
        html += `<div style="font-size: 12px; color: #aaa; font-style: italic;">Why: ${result.reasoning.scaleChoice}</div>`;
    }
    html += '</div>';
    
    // PROGRESSION WITH TIERS & FUNCTION (NEW!)
    if (result.progression && result.progression.length > 0) {
        html += '<div class="progression-info" style="margin-bottom: 16px;">';
        html += `<div style="font-weight: bold; color: #FFD700; margin-bottom: 6px;">🎹 PROGRESSION</div>`;
        
        result.progression.forEach((chord, i) => {
            // Get tier info for color
            const tierColor = chord.tierInfo ? chord.tierInfo.color : '#666';
            const tierLabel = chord.tierInfo ? chord.tierInfo.label : '';
            const tierStars = '★'.repeat(chord.tier || 1);
            
            html += `<div style="border-left: 3px solid ${tierColor}; padding: 8px 12px; margin-bottom: 8px; background: rgba(255,255,255,0.02); border-radius: 3px;">`;
            html += `<div style="font-size: 14px; font-weight: 500;">${chord.fullName || chord}</div>`;
            
            // Show function and tier
            if (chord.function) {
                html += `<div style="font-size: 11px; color: #aaa; margin-top: 2px;">${chord.function}, Tier ${chord.tier} ${tierStars}</div>`;
            }
            
            // Show reasoning for this chord
            if (chord.reasoning) {
                html += `<div style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">→ ${chord.reasoning}</div>`;
            }
            html += '</div>';
        });
        
        // Show progression logic
        if (result.reasoning && result.reasoning.progressionLogic) {
            html += `<div style="font-size: 11px; color: #888; margin-top: 8px; font-style: italic;">Progression Logic: ${result.reasoning.progressionLogic}</div>`;
        }
        
        html += '</div>';
    }
    
    // COMPLEXITY
    if (result.complexity) {
        html += '<div class="complexity-info" style="margin-bottom: 16px;">';
        html += `<div style="font-weight: bold; color: #FFD700; margin-bottom: 6px;">⚙️ COMPLEXITY</div>`;
        
        if (typeof result.complexity === 'object') {
            html += `<div style="font-size: 12px; line-height: 1.6;">`;
            if (result.complexity.harmonic !== undefined) {
                html += `Harmonic: ${Math.round(result.complexity.harmonic * 100)}%<br>`;
            }
            if (result.complexity.rhythmic !== undefined) {
                html += `Rhythmic: ${Math.round(result.complexity.rhythmic * 100)}%<br>`;
            }
            if (result.complexity.emotional !== undefined) {
                html += `Emotional: ${Math.round(result.complexity.emotional * 100)}%<br>`;
            }
            html += `Overall: ${result.complexity.overall || 'moderate'}`;
            html += `</div>`;
        } else {
            html += `<div style="font-size: 12px;">${result.complexity}</div>`;
        }
        
        html += '</div>';
    }
    
    // ARCHETYPE
    if (result.archetypeMatch) {
        html += '<div class="archetype-info" style="margin-bottom: 16px;">';
        html += `<div style="font-weight: bold; color: #FFD700; margin-bottom: 6px;">🎭 ARCHETYPE</div>`;
        html += `<div style="font-size: 14px; margin-bottom: 4px;">${result.archetypeMatch.name}</div>`;
        if (result.archetypeMatch.description) {
            html += `<div style="font-size: 11px; color: #aaa; font-style: italic;">${result.archetypeMatch.description}</div>`;
        }
        html += '</div>';
    }
    
    // WORD-BY-WORD ANALYSIS (collapsible)
    if (result.reasoning && result.reasoning.wordAnalyses && result.reasoning.wordAnalyses.length > 0) {
        html += '<details style="margin-top: 16px; cursor: pointer;">';
        html += '<summary style="font-weight: bold; color: #FFD700; margin-bottom: 8px;">📝 WORD-BY-WORD ANALYSIS</summary>';
        html += '<div style="padding-left: 12px; margin-top: 8px; border-left: 2px solid #444;">';
        
        result.reasoning.wordAnalyses.forEach(wa => {
            html += `<div style="margin-bottom: 12px;">`;
            html += `<div style="font-weight: 500; color: #64C8FF; margin-bottom: 4px;">"${wa.word}"</div>`;
            html += `<div style="font-size: 11px; color: #aaa;">valence: ${wa.emotional.valence.toFixed(2)}, arousal: ${wa.emotional.arousal.toFixed(2)}</div>`;
            
            if (wa.implications && wa.implications.reasoning) {
                html += '<ul style="margin: 6px 0; padding-left: 20px; font-size: 11px; color: #888;">';
                wa.implications.reasoning.forEach(r => {
                    html += `<li>${r}</li>`;
                });
                html += '</ul>';
            }
            html += `</div>`;
        });
        
        html += '</div>';
        html += '</details>';
    }
    
    html += '</div>';
    
    analysisPanel.innerHTML = html;
}
