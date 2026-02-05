#!/usr/bin/env python3
"""
Safe, targeted fix for learn-inversions.js black key and silent click issues
"""

import re
from pathlib import Path

file_path = Path(__file__).parent / 'learn-inversions.js'

print(f"Reading {file_path}...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Fix 1: Add .active class removal in clearAllHighlights
print("Fix 1: Adding .active class removal...")
content = content.replace(
    "whiteKeys.forEach(key => {\n                key.classList.remove('highlighted');",
    "whiteKeys.forEach(key => {\n                key.classList.remove('highlighted');\n                key.classList.remove('active');  // Remove .active class"
)

content = content.replace(
    "blackKeys.forEach(key => {\n                key.classList.remove('highlighted');",
    "blackKeys.forEach(key => {\n                key.classList.remove('highlighted');\n                key.classList.remove('active');  // Remove .active class"
)

# Fix 2: Clear activeNotes in updateVisualization
print("Fix 2: Clearing activeNotes state...")
content = content.replace(
    "this._sharedPiano.state.chordNotes = [];",
    "this._sharedPiano.state.chordNotes = [];\n                this._sharedPiano.state.activeNotes = [];  // Clear active notes\n                this._sharedPiano.state.activeMidiNotes = null;  // Clear MIDI array"
)

# Fix 3: Enhance audio logging
print("Fix 3: Adding audio engine logging...")
content = content.replace(
    "if (!this._audioEngine) {\n                        console.warn('[LearnInversions] No audio engine available to play note', midi);",
    "if (!this._audioEngine) {\n                        console.error('[LearnInversions] ❌ No audio engine to play note', midi);"
)

content = content.replace(
    "} else {\n                        this.playNote(midi, { duration: 0.45, velocity: 0.95 });",
    "} else {\n                        console.log('[LearnInversions] ▶️ Playing note', midi);\n                        this.playNote(midi, { duration: 0.45, velocity: 0.95 });"
)

if content != original:
    print(f"\n✅ Applying {content.count('// Remove .active class')} fixes...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Fixed successfully!")
    print("\n📋 Reload browser and test clicking piano keys")
else:
    print("ℹ️ No changes needed")
