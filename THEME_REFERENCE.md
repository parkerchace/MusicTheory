# Theme System Reference

## Overview
The Music Theory Studio V12 now includes 3 professional DAW-style themes that can be switched live via the `[THEME]` button in the control deck.

## Available Themes

### 1. Clean DAW (Default)
**Style**: Logic Pro / Ableton Live inspired
**Color Scheme**: Dark grey with subtle blue accents
**Module Colors**: Subtle header color bands only
- Amber: Number Generator
- Cyan: Chord Explorer  
- Grey: Sheet Music (neutral)
- Magenta: Progression Builder
- Teal: Solar System
- Orange: Circle of Fifths
- Green: Container Chord Tool

**Best For**: Clean, professional workflows; minimal distraction

---

### 2. Channel Strip
**Style**: Reaper / Pro Tools inspired
**Color Scheme**: Blue-grey with cyan highlights
**Module Colors**: Left border strips + subtle background wash
- Each module has a colored 3px left border
- Module backgrounds have gentle color gradients
- Headers use matching module colors

**Best For**: Strong visual separation between modules; tracking/mixing workflows

---

### 3. Matrix FX
**Style**: Cyberpunk / Y2K Futurism
**Color Scheme**: Pure black with neon cyan/green accents
**Module Colors**: Strong accent glow with background wash
- Modules have colored borders with opacity
- Radial gradient backgrounds from module color
- Headers have text-shadow glow effects
- Strong hover effects with colored shadows

**Best For**: Late-night sessions; creative sound design; futuristic aesthetic

---

## Module Color Mapping

| Module | Category | Color | Purpose |
|--------|----------|-------|---------|
| **Number Generator** | INPUT | Amber (#f59e0b) | Input/generation tools |
| **Chord Explorer** | DB | Cyan (#00f3ff) | Database/reference |
| **Sheet Music** | VISUAL | Grey (#94a3b8) | Neutral display |
| **Progression Builder** | SEQ | Magenta (#d946ef) | Sequencing/composition |
| **Solar System** | SYS | Teal (#06b6d4) | System visualizers |
| **Circle of Fifths** | REF | Orange (#f97316) | Reference tools |
| **Container Chord** | TOOL | Green (#10b981) | Analysis tools |
| **Piano Deck** | - | Minimal | Instrument interface |

---

## Technical Implementation

### CSS Architecture
- Theme switched via `data-theme` attribute on `<body>`
- CSS variables defined in `:root` (structure) and `body[data-theme="..."]` (theme-specific)
- Module colors use `.mod-*` classes combined with theme selectors
- Shared color definitions in `:root` ensure consistency

### Theme Persistence
- Current theme saved to `localStorage` as `music-theory-theme`
- Restored on page load
- Cycles through themes: Clean DAW → Channel Strip → Matrix FX → (repeat)

### JavaScript Control
```javascript
// Current theme stored in body attribute
document.body.getAttribute('data-theme') // => 'clean-daw' | 'channel-strip' | 'matrix-fx'

// Manually set theme
document.body.setAttribute('data-theme', 'matrix-fx');
localStorage.setItem('music-theory-theme', 'matrix-fx');
```

---

## Design Philosophy

Each theme targets different user preferences:

1. **Clean DAW**: Professionals who want minimal visual noise; focus on content
2. **Channel Strip**: Engineers who need strong module boundaries; mixer-style workflows  
3. **Matrix FX**: Creative users who want aesthetic immersion; late-night vibes

All themes maintain:
- Readable text contrast
- Clear interactive element states
- Consistent spacing/layout
- Proper module content visibility

---

## Future Enhancements
- [ ] Custom theme builder (user-defined colors)
- [ ] Per-module theme overrides
- [ ] Theme export/import
- [ ] High-contrast accessibility mode
- [ ] Auto-switch based on time of day
