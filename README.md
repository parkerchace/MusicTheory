# Music Theory Studio

[Live Demo](https://parkerchace.github.io/MusicTheory/modular-music-theory.html)

A browser-based collection of modular music theory tools for exploration, practice, and composition. This project provides an interactive, event-driven environment where harmonic discovery is linked across multiple visualizers and engines.

## Features

### Educational Modules
A suite of structured learning tools for music fundamentals:
- **Learn Notes (Piano/Guitar)**: Drills for mastering intervals and positions.
- **Learn Scales & Chords**: Interactive exploration of triad construction and scale degrees.
- **Learn Inversions**: Tools for visualizing chord voicings and practicing voice leading.

### MIDI Integration
- **Plug-and-Play**: Connect any class-compliant MIDI controller (keyboard, pads, breath controller) and the studio will automatically detect and route it to the active piano engine.
- **Hardware Feedback**: MIDI input synchronizes with the Piano Visualizer and Guitar Fretboard in real-time, allowing you to see exactly which scale degrees or chord extensions you are triggering on your hardware.

### Exploration Engines
    - Modal interchange and chromatic variants.
- **Container Chord Tool**: Finds scales that contain a specific set of notes or chords.

### Visualizers
- **Solar System Visualizer**: Maps music theory concepts to orbital mechanics to visually emphasize the tonic (center of the system).
- **Piano & Guitar Fretboard**: Synced views that highlight scale tones, root positions, and chord voicings across instruments.
- **Sheet Music Generation**: Renders notation in real-time with functional analysis.

## Workspace & UI

- **Modular Architecture**: Built with Vanilla JS, HTML5, and CSS3. No build steps or external dependencies required.
- **Interactive Layout**: A resizable workspace where users can drag splitters to adjust column widths and drag-and-drop modules to reorder the interface.
- **Theme System**: Multiple aesthetic modes (Clean DAW, Channel Strip, Matrix FX, Steam 2000) that adjust the visual style of the Entire Studio.

## Quick Start

1. Open `modular-music-theory.html` in a modern browser.
2. Use the **Module Selector** (⚙️) at the top to toggle specific tools.
3. Select scales from the **Scale Library** to update all visualizers simultaneously.

## Legal & Copyright
- **Public Domain Elements**: Common musical parameters (scales, intervals, triads) are building blocks of music and are treated as common-property.
- **Educational Intent**: This project is for personal and educational use. For requests regarding the removal of specific pedagogical material, contact `sparkerchace@gmail.com`.

---
*Created by Parker Chace*
