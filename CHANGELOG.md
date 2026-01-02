# Changelog

## [2025-12-09] - Interactive Tutorial System & Learning Modes

### Added
- **Easy Mode**: Complete interactive guided tutorial system
  - 8-step progressive learning path from basics to advanced
  - Visual highlights with pulsing animations on target elements
  - Step-by-step tooltips with clear explanations
  - Progress counter showing current step
  - Skip/Next navigation controls
  - First-time visitor detection with automatic tutorial offer
  - Green badge indicator when active
  
- **Demo Mode**: Hover-activated help system
  - Instant tooltips when hovering over any tool or module
  - Covers 12+ interface elements with detailed explanations
  - Non-intrusive, always-available on-demand help
  - Smart positioning (auto-adjusts to viewport)
  - Blue badge indicator when active
  
- **Module Toggle Dropdown Styling**: Professional UI for module visibility controls
  - Properly styled checkboxes with hover effects
  - Smooth open/close animations
  - Color-coded labels matching module themes
  - Dropdown panel with backdrop and shadow
  
- **Tutorial System Features**:
  - Full-screen dimmed overlay during lessons
  - Z-indexed layer system (9998-10001) for proper stacking
  - Click-through for targeted interactive elements
  - Animated highlight boxes with glow effects
  - Responsive tooltip positioning
  - LocalStorage persistence for preferences

### Tutorial Content
1. **Welcome**: Introduction to scales and music theory
2. **Scale Selection**: Choosing C Major as starting point
3. **Circle of Fifths**: Understanding note relationships
4. **Number Generator**: Creating melody patterns (1-3-5-1)
5. **Chord Building**: Basics of harmony and chords
6. **Piano Visualizer**: Playing and hearing notes
7. **Progressions**: Common patterns like I-IV-V-I
8. **Next Steps**: Enabling Demo Mode for continued learning

### Demo Tooltips Coverage
- Scale Selector, Circle of Fifths, Number Generator
- Container Chord Tool, Sheet Music Generator
- Chord Explorer, Piano Visualizer
- Manual Chord Input, Grading View selector
- Theme Switcher, Layout Toggle, Module toggles

### Technical Implementation
- ~500 lines of new JavaScript for tutorial engine
- ~200 lines of CSS for overlays, tooltips, badges
- Event-driven architecture with state management
- Keyboard-friendly navigation
- WCAG-compliant color contrast
- Mobile-responsive (adapts to small screens)

### Documentation
- Added `TUTORIAL_SYSTEM.md` - Developer documentation
- Added `TUTORIAL_QUICK_REFERENCE.txt` - User guide
- Updated code comments for maintainability

### User Experience
- Beginner-friendly onboarding flow
- Self-paced learning with skip option
- Context-aware help that highlights relevant tools
- Visual feedback (badges, highlights, animations)
- Persistent preferences across sessions

---

## [2025-12-07] - Layout & Spacing Fixes

### Fixed
- **Progression Builder**: Added complete CSS styling that was missing (caused display/spacing issues)
  - 2D control pad now properly styled with tier bands and cursor
  - Input chips, controls, and status cards properly formatted
  - Module now has max-height (420px) to prevent excessive vertical space usage
  - Controls (buttons, sliders, select dropdowns) now properly styled
  
- **Center Stage Column**: Fixed spacing between modules
  - Added 10px gap between modules (was 0, causing them to stack without separation)
  - Added bottom padding to column for breathing room
  
- **Sheet Music Module**: Added size constraints
  - Min-height: 180px, max-height: 300px
  - Overflow-y: auto for scrolling if content exceeds max height
  - Set flex: 0 0 auto to prevent unwanted growth
  
- **Mini Chord Strip**: Made sticky and properly visible
  - Positioned sticky at top of center column with z-index: 5
  - Dark background (rgba(0,0,0,0.9)) for contrast
  - Proper padding and border styling
  
- **Button Styles**: Added missing `.btn` and `.btn-primary` classes
  - Progression builder buttons now have proper hover states
  - Primary buttons use accent color with proper contrast

### Technical Details
- Added 250+ lines of progression builder CSS covering:
  - `.progression-builder-ui` layout structure
  - `.pb-top`, `.pb-left`, `.pb-pad` flexbox layouts
  - 2D control pad surface with tier bands and grid
  - Input chips and controls styling
  - Status cards and labels
- Button system uses theme CSS variables for consistency across all 3 themes
- All modules maintain proper hierarchy: flex sizing prevents overflow issues

### Notes
- Unified Chord Explorer CSS already linked (`unified-chord-explorer.css`)
- All module connections to sheet music, container chord tool verified
- Theme switcher working across all 3 themes (Clean DAW, Channel Strip, Matrix FX)

---

## [Previous Entries...]

All notable changes to this project will be documented in this file.

## 2025-12-02

- Merge: Integrated local import with `origin/master` while preserving local files (safety tags: `local-import-20251202`, `merge-preserve-local-20251202`).
- Documentation:
  - Fixed hardcoded Windows user paths; now use `%USERPROFILE%` / `$env:USERPROFILE`.
  - Added Docs Index to `README.md` and clarified ES module usage.
  - Updated `BUILD_AND_RUN.md`, `BITWIG_MIDI_INTEGRATION.md`, `FINAL_STATUS.md`, `READ_ME_FIRST.txt`, `vst3-plugin/QUICKSTART.md`.
  - Expanded `TESTING_GUIDE.md` with browser/Node automated test instructions.
  - Added automated citation validation instructions to `SCALE_VERIFICATION.md`.
  - Updated `FILE_INDEX.md` last updated date.
- CI: Retained `update-readme` workflow to auto-refresh module table via `tools/update_readme.js`.

Notes:
- DAW/VST integration is optional and can be ignored if not in scope.
- Core browser modules and integration tests are ready to run without the MIDI server.
