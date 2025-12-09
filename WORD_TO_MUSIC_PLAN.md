# Word-to-Music & Advanced Grading System Plan

## Overview
This document outlines the plan to implement a generative music system based on semantic associations (words -> music) and an expanded grading/attribute system for chords and scales.

## 1. Expanded Grading/Attribute System
Currently, the system uses a "Grade Tier" (0-4 stars) based on diatonic function. We will expand this to support multiple "Grading Types" or "Attribute Dimensions".

### Proposed Dimensions
1.  **Functional Harmony (Current)**
    *   **Axis**: Consonance / Diatonic Function
    *   **Values**: Perfect (Diatonic), Excellent, Good, Fair, Experimental (Chromatic)
    *   **Visuals**: Green -> Yellow -> Red/Purple spectrum.

2.  **Emotional/Affective (New)**
    *   **Axis**: Valence (Sad <-> Happy) or Arousal (Calm <-> Intense)
    *   **Data Source**: Mapping of chord types (min, maj, dim, aug) and extensions to emotional keywords.
    *   **Example**: `minMaj7` -> "Mystery", "Noir", "Tension".

3.  **Color/Synesthesia (New)**
    *   **Axis**: Brightness (Dark <-> Bright)
    *   **Data Source**: Scale/Mode brightness (Lydian = Bright, Locrian = Dark).
    *   **Visuals**: Dark Blue/Black -> Bright Yellow/White.

### UI Changes
*   **Selector**: Add a dropdown or toggle in the `ProgressionBuilder` and `ContainerChordTool` to select the active "Grading View".
*   **2D Pad Update**: The `pg-2d-pad` Y-axis (and potentially X-axis) will dynamically remap to the selected dimension.
    *   *Current*: Y = Grade Tier.
    *   *New*: Y = Selected Attribute Intensity.
*   **Visual Feedback**: The background bands (`pb-tier-band`) will update colors/labels based on the selected view.

## 2. Word-to-Music API (Dictionary Integration)
The goal is to generate musical ideas based on input words (e.g., "fire", "mountain", "journey").

### Architecture
1.  **Dictionary API**:
    *   Integrate an external API (e.g., Datamuse, Oxford, or a custom local JSON map) to retrieve definitions, synonyms, and related words.
    *   *Future*: Localization support.

2.  **Semantic-to-Musical Mapper**:
    *   Create a logic layer that maps semantic properties to musical parameters.
    *   **Keywords -> Attributes**:
        *   "Fire" -> High energy, dissonant, fast, bright (Lydian/Augmented).
        *   "Mountain" -> Stable, open intervals (5ths), slow, majestic (Major/Mixolydian).
        *   "Journey" -> Movement, modulation, circle of fifths.
    *   **Intervallic Logic**: Define intervals and chord qualities associated with semantic clusters.

3.  **Generative Engine**:
    *   Input: List of words.
    *   Process:
        1.  Analyze words for sentiment/imagery.
        2.  Select appropriate "Grading Type" or constraints.
        3.  Generate a chord progression or melody using the existing harmonization tools but biased by the semantic analysis.
    *   Output: MIDI / Audio playback.

## 3. Implementation Steps (One by One)

1.  **Refactor Grading UI**:
    *   Make the current "Grade Key" more visible.
    *   Abstract the "Grade Tier" logic so it can be swapped.

2.  **Implement Grading Type Selector**:
    *   Add UI to switch between "Functional" and "Emotional" (placeholder) modes.
    *   Update `pg-2d-pad` to reflect the switch.

3.  **Dictionary API Integration**:
    *   Create a service to fetch word data.
    *   Build a simple UI to input words.

4.  **Semantic Mapping Logic**:
    *   Develop the ruleset for Word -> Music translation.

5.  **Generative Integration**:
    *   Connect the Word input to the Progression Builder.
