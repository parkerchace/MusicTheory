# Music Theory Visual Preset System

## Overview
The Unified Chord Explorer now features a comprehensive preset system based on state-of-the-art music theory concepts. Each preset uses color and organization to highlight different theoretical relationships.

## Available Presets

### 1. Functional Harmony (Default)
**Theory Foundation**: Rameau/Riemann functional analysis  
**Color Scheme**:
- **Tonic** (green): Stable, restful resolution targets
- **Dominant** (red): Tension, strong resolution drive
- **Secondary** (amber): Secondary dominants and tonicization
- **Modal** (violet): Modal interchange and borrowed chords
- **Extension** (blue): Predominant preparation chords
- **Mediant** (pink): Chromatic mediant relationships

**Use Case**: Traditional harmonic analysis, classical progressions, understanding tension/resolution

---

### 2. Voice Leading
**Theory Foundation**: Neo-Riemannian theory, Cohn transformations  
**Color Scheme**:
- **Cool colors** (cyan/blue): Smooth, parsimonious voice motion
- **Warm colors** (orange): Stronger, more dramatic voice motion
- **Purple**: Chromatic but smooth motion

**Visual Logic**: Color intensity reflects voice leading distance  
**Use Case**: Understanding voice motion smoothness, Neo-Riemannian transformations, minimal-displacement substitutions

---

### 3. Chromatic Tension
**Theory Foundation**: Schenker prolongation, Straus chromatic voice leading  
**Color Scheme**:
- **Cool (blue)**: Diatonic extensions and relationships
- **Warm (orange/pink)**: Chromatic alterations and tension
- **Saturation**: Encodes alteration density

**Use Case**: Distinguishing diatonic vs chromatic harmony, analyzing alteration layers, modal mixture

---

### 4. Jazz Bebop
**Theory Foundation**: Berklee harmony, George Russell Lydian Chromatic Concept  
**Color Scheme**:
- **Strong red**: V7 dominant family
- **Gold**: Secondary dominants
- **Emerald**: Target/resolution chords
- **Deep purple**: Modal interchange
- **Royal blue**: 9/11/13 extensions
- **Magenta**: Tritone subs, chromatic mediants

**Visual Logic**: Emphasizes guide tone motion (3-7 movement)  
**Use Case**: Jazz composition, bebop analysis, understanding guide tone lines

---

### 5. Classical Period
**Theory Foundation**: Galant style, Haydn/Mozart harmony, figured bass tradition  
**Color Scheme**:
- **Forest green**: Stability (I, tonic function)
- **Dark red**: Cadential goals (V, dominant)
- **Amber/brown**: Applied chords
- **Deep purple**: Rare chromaticism
- **Navy**: 7th chords
- **Burgundy**: Deceptive motion

**Visual Logic**: Reflects classical cadential hierarchy  
**Use Case**: Period-appropriate analysis, Classical/Baroque composition, understanding historical harmonic norms

---

### 6. Neo-Riemannian
**Theory Foundation**: Transformational theory (Cohn, Lewin), PLR operations  
**Color Scheme**:
- **Teal**: Triad space, parsimonious transforms
- **Amber**: Functional relationships
- **Fuchsia**: Direct PLR transformations (Parallel, Leading-tone, Relative)
- **Violet**: Chromatic mediants

**Visual Logic**: Color distance reflects number of transformations from origin chord  
**Use Case**: 19th-century harmony, film music analysis, understanding triadic transformations

---

## Technical Details

### Color Application
- **Node borders**: Use family color from current preset
- **Node background**: Subtle gradient mixing family color with dark background
- **Arc opacity**: Varies by preset (0.1-0.2) for optimal visibility
- **Node scale**: Adjustable per preset (0.98-1.1) for emphasis

### CSS Variables
Presets dynamically set CSS custom properties:
```css
--preset-dominant
--preset-secondary
--preset-tonic
--preset-modal
--preset-extension
--preset-mediant
--preset-grade-perfect
--preset-grade-excellent
--preset-grade-good
--preset-arc-opacity
--preset-node-scale
```

### API
```javascript
// Switch preset programmatically
explorer.setPreset('jazz');

// Get current preset config
const preset = explorer.getCurrentPreset();

// Listen for preset changes
explorer.on('presetChanged', (data) => {
    console.log('Preset:', data.preset, data.config);
});
```

## Pedagogical Value

### Teaching Use Cases
1. **Functional Harmony**: Teach students to identify tonic/predominant/dominant roles
2. **Voice Leading**: Visualize smoothness of different substitution paths
3. **Chromatic Tension**: Show how alterations add color and tension
4. **Jazz**: Emphasize guide tone continuity in bebop
5. **Classical**: Understand period-appropriate harmonic choices
6. **Neo-Riemannian**: Analyze 19th-century chromatic harmony through transformations

### Research Applications
- Compare theoretical frameworks side-by-side
- Validate substitution quality across different analytical lenses
- Discover new relationships by switching perspectives

## Future Enhancements
- Custom preset creation UI
- Preset-specific layout algorithms (e.g., PLR distance in Neo-Riemannian mode)
- Animated preset transitions showing color evolution
- Export preset-annotated chord progressions as images
- Preset-based filtering (show only chords matching theory criteria)

## References
- Rameau, J.-P. (1722). *Traité de l'harmonie*
- Riemann, H. (1893). *Vereinfachte Harmonielehre*
- Cohn, R. (1996). "Maximally Smooth Cycles, Hexatonic Systems, and the Analysis of Late-Romantic Triadic Progressions"
- Russell, G. (1953). *Lydian Chromatic Concept of Tonal Organization*
- Schenker, H. (1935). *Der freie Satz*
- Levine, M. (1995). *The Jazz Theory Book*
- Nettles, B. & Graf, R. (1997). *The Chord Scale Theory*
