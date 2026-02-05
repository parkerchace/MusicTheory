#!/usr/bin/env python3
"""
Automated fix script for learn-inversions.js issues:
- Ensures audio engine initializes properly
- Fixes piano key clickability and styling
- Prevents black keys appearing incorrectly
"""

import re
import sys
from pathlib import Path

def fix_learn_inversions(file_path):
    """Apply comprehensive fixes to learn-inversions.js"""
    
    print(f"Reading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = []
    
    # Fix 1: Ensure audio engine falls back to modularApp.audioEngine immediately
    print("Fix 1: Adding robust audio engine fallback...")
    pattern1 = r"(initAudio\(\) \{[\s\S]*?if \(this\._audioEngine && typeof this\._audioEngine\.init === 'function'\) \{[\s\S]*?\}\s*\})"
    replacement1 = r"""initAudio() {
            if (this._audioEngine) return;

            if (typeof PianoSampleEngine !== 'undefined') {
                const piano = new PianoSampleEngine();
                this._audioEngine = {
                    _kind: 'piano-sample',
                    _engine: piano,
                    init: () => piano.init(),
                    playNote: (midi, options = {}) => {
                        const opts = typeof options === 'number' ? { duration: options } : (options || {});
                        const duration = typeof opts.duration === 'number' ? opts.duration : 0.6;
                        const velocity = typeof opts.velocity === 'number' ? opts.velocity : 0.95;
                        piano.playNote(midi, duration, 0, velocity);
                    },
                    playChord: (notes, options = {}) => {
                        const opts = typeof options === 'number' ? { duration: options } : (options || {});
                        const duration = typeof opts.duration === 'number' ? opts.duration : 0.9;
                        const velocity = typeof opts.velocity === 'number' ? opts.velocity : 0.95;
                        piano.playChord(notes, duration, velocity);
                    }
                };
            } else if (typeof EnhancedAudioEngine !== 'undefined') {
                this._audioEngine = new EnhancedAudioEngine({ masterVolume: 0.3 });
            } else if (window.modularApp && window.modularApp.audioEngine) {
                this._audioEngine = window.modularApp.audioEngine;
                console.log('[LearnInversions] Using modularApp.audioEngine');
            } else if (typeof SimpleAudioEngine !== 'undefined') {
                this._audioEngine = new SimpleAudioEngine();
            }

            // Critical: if still no audio, try modularApp again as fallback
            if (!this._audioEngine && typeof window !== 'undefined' && window.modularApp && window.modularApp.audioEngine) {
                this._audioEngine = window.modularApp.audioEngine;
                console.log('[LearnInversions] Fallback to modularApp.audioEngine');
            }

            if (this._audioEngine && typeof this._audioEngine.init === 'function') {
                try {
                    const res = this._audioEngine.init();
                    if (res && typeof res.then === 'function') res.catch(() => {});
                } catch(_) {}
            }
            
            console.log('[LearnInversions] Audio engine initialized:', !!this._audioEngine);
        }"""
    
    if re.search(pattern1, content):
        content = re.sub(pattern1, replacement1, content)
        changes.append("Enhanced initAudio() with robust fallback")
    
    # Fix 2: Force clear ALL piano state in clearAllHighlights
    print("Fix 2: Strengthening clearAllHighlights to remove .active class...")
    pattern2 = r"(clearAllHighlights\(\) \{[\s\S]*?blackKeys\.forEach\(key => \{[\s\S]*?\}\);[\s\S]*?\})"
    
    if "key.classList.remove('active')" not in content:
        replacement2 = r"""clearAllHighlights() {
            if (!this._sharedPiano || !this._sharedPiano.pianoElement) return;
            
            // Clear all highlighted keys
            const whiteKeys = this._sharedPiano.pianoElement.querySelectorAll('.piano-white-key');
            const blackKeys = this._sharedPiano.pianoElement.querySelectorAll('.piano-black-key');
            
            whiteKeys.forEach(key => {
                key.classList.remove('highlighted');
                key.classList.remove('active');  // CRITICAL: remove active class too
                key.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px -1px 2px inset';
                key.style.background = 'linear-gradient(rgb(255, 255, 255), rgb(224, 224, 224))';
                key.style.borderWidth = '';
                key.style.borderColor = 'var(--border-light)';
                key.style.opacity = '1';
                // Re-enable pointer events in case another script disabled them
                try { key.style.pointerEvents = 'auto'; } catch(_) {}
                
                // Remove degree label
                const label = key.querySelector('.degree-label');
                if (label) label.remove();
            });
            
            blackKeys.forEach(key => {
                key.classList.remove('highlighted');
                key.classList.remove('active');  // CRITICAL: remove active class too
                key.style.boxShadow = 'rgba(255, 255, 255, 0.2) 0px 0px 2px inset, rgba(0, 0, 0, 0.4) 2px 2px 4px';
                key.style.background = 'linear-gradient(rgb(51, 51, 51), rgb(0, 0, 0))';
                key.style.opacity = '1';
                
                // Remove degree label
                const label = key.querySelector('.degree-label');
                if (label) label.remove();
                try { key.style.pointerEvents = 'auto'; } catch(_) {}
            });
        }"""
        
        content = re.sub(pattern2, replacement2, content)
        changes.append("Added .active class removal in clearAllHighlights")
    
    # Fix 3: Clear piano state more aggressively in updateVisualization
    print("Fix 3: Clearing activeNotes state in updateVisualization...")
    pattern3 = r"(updateVisualization\(\) \{[\s\S]*?if \(this\._sharedPiano\.state\) \{[^\}]*?\})"
    
    if "this._sharedPiano.state.activeNotes = []" not in content:
        replacement3 = r"""updateVisualization() {
            if (!this._sharedPiano) return;

            const chordNotes = this.getChordNotes();

            // Clear ALL scale/highlight state - no scale highlighting in this module
            if (typeof this._sharedPiano.setHighlightedNotes === 'function') {
                this._sharedPiano.setHighlightedNotes([]);
            }
            if (this._sharedPiano.state) {
                this._sharedPiano.state.highlightedNotes = [];
                this._sharedPiano.state.scaleNotes = [];
                this._sharedPiano.state.activeChord = null;
                this._sharedPiano.state.chordNotes = [];
                this._sharedPiano.state.activeNotes = [];  // CRITICAL: clear active notes
                this._sharedPiano.state.activeMidiNotes = null;  // CRITICAL: clear MIDI array
            }"""
        
        # Find and replace just the state clearing section
        state_clear_pattern = r"(if \(this\._sharedPiano\.state\) \{\s*this\._sharedPiano\.state\.highlightedNotes = \[\];[\s\S]*?this\._sharedPiano\.state\.chordNotes = \[\];\s*\})"
        state_clear_replacement = r"""if (this._sharedPiano.state) {
                this._sharedPiano.state.highlightedNotes = [];
                this._sharedPiano.state.scaleNotes = [];
                this._sharedPiano.state.activeChord = null;
                this._sharedPiano.state.chordNotes = [];
                this._sharedPiano.state.activeNotes = [];  // CRITICAL: clear active notes
                this._sharedPiano.state.activeMidiNotes = null;  // CRITICAL: clear MIDI array
            }"""
        
        if re.search(state_clear_pattern, content):
            content = re.sub(state_clear_pattern, state_clear_replacement, content)
            changes.append("Added activeNotes clearing in updateVisualization")
    
    # Fix 4: Ensure piano element is brought to front and interactive in updatePianoRange
    print("Fix 4: Ensuring piano element z-index and pointer-events in updatePianoRange...")
    if "// Ensure the shared piano is on top" not in content or content.count("// Ensure the shared piano is on top") < 2:
        # Find updatePianoRange and ensure piano styling is applied
        pattern4 = r"(if \(this\._sharedPiano\.pianoElement && !pianoContainer\.contains\(this\._sharedPiano\.pianoElement\)\) \{[\s\S]*?pianoContainer\.appendChild\(this\._sharedPiano\.pianoElement\);)"
        
        replacement4 = r"""if (this._sharedPiano.pianoElement && !pianoContainer.contains(this._sharedPiano.pianoElement)) {
                pianoContainer.appendChild(this._sharedPiano.pianoElement);
                // Ensure the shared piano is on top and interactive (fix accidental overlays)
                try {
                    const pe = this._sharedPiano.pianoElement;
                    if (pe && pe.style) {
                        pe.style.position = pe.style.position || 'relative';
                        pe.style.zIndex = '9999';
                        pe.style.pointerEvents = 'auto';
                    }
                    // Make sure piano container allows interaction
                    pianoContainer.style.position = pianoContainer.style.position || 'relative';
                    pianoContainer.style.zIndex = pianoContainer.style.zIndex || '1';
                    // Force all piano keys to be interactive
                    pe.querySelectorAll('.piano-white-key, .piano-black-key').forEach(k => {
                        k.style.pointerEvents = 'auto';
                        k.style.cursor = 'pointer';
                    });
                } catch(_) {}
            }"""
        
        if re.search(pattern4, content):
            content = re.sub(pattern4, replacement4, content)
            changes.append("Enhanced piano element styling in updatePianoRange")
    
    # Check if any changes were made
    if content == original_content:
        print("No changes needed - file already appears to be fixed.")
        return False
    
    # Write the fixed content
    print(f"\nApplying {len(changes)} fixes...")
    for i, change in enumerate(changes, 1):
        print(f"  {i}. {change}")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✅ Successfully fixed {file_path}")
    return True

if __name__ == '__main__':
    script_dir = Path(__file__).parent
    target_file = script_dir / 'learn-inversions.js'
    
    if not target_file.exists():
        print(f"❌ Error: {target_file} not found")
        sys.exit(1)
    
    try:
        success = fix_learn_inversions(target_file)
        if success:
            print("\n🎉 All fixes applied successfully!")
            print("\n📋 Next steps:")
            print("  1. Reload your browser page")
            print("  2. Test clicking piano keys (especially root, E, G)")
            print("  3. Verify audio plays when clicking keys")
            print("  4. Check that keys show correct colors (not black)")
        else:
            print("\n✅ File already has all fixes applied")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error applying fixes: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
