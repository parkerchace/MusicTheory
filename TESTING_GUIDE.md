# Testing Guide for UI Cleanup Changes

## Quick Test Checklist

### ✅ Basic Functionality

#### 1. App Loads Correctly
- [ ] Page loads without errors (check console)
- [ ] Header displays "Music Theory Studio"
- [ ] Key/Scale selector shows "C Major"
- [ ] All 4 workflow sections visible

#### 2. Step 1: INPUT
- [ ] Number Generator shows with sliders
- [ ] Click "Generate" creates new numbers
- [ ] Numbers display with dice emoji 🎲
- [ ] Scale Library shows dropdown
- [ ] Changing scale updates key/scale in header

#### 3. Step 2: VISUALIZE
- [ ] Piano keyboard displays
- [ ] Scale notes highlighted on piano
- [ ] Circle explorer shows
- [ ] Solar System mini preview displays
- [ ] "Show Full View" button works

#### 4. Step 3: ANALYZE
- [ ] Chord Explorer shows diatonic chords
- [ ] Click a chord highlights it
- [ ] Container Chord Finder shows generated number bubbles
- [ ] Click a bubble loads that note
- [ ] Chord results display

#### 5. Step 4: BUILD
- [ ] Progression Builder displays
- [ ] Input degrees show from Step 1
- [ ] Complexity slider moves smoothly
- [ ] Quality slider has 5 steps
- [ ] Generate button creates progression
- [ ] Progression displays with colored borders

---

## Visual Feedback Tests

### Animated Arrows
- [ ] Blue down arrows (↓) appear between sections
- [ ] Arrows animate up and down

### Updated Badges
- [ ] Generate numbers → "Updated" badge appears on Number Generator
- [ ] Change scale → "Updated" badge appears on Scale Library
- [ ] Badges disappear after 3 seconds

### Section Highlighting
- [ ] Generate numbers → Step 1 (INPUT) gets blue glow
- [ ] Change scale → Steps 1 & 2 get blue glow briefly
- [ ] Select chord → Step 3 (ANALYZE) gets blue glow
- [ ] Generate progression → Step 4 (BUILD) gets blue glow

---

## Progression Builder Slider Tests

### Complexity Slider
1. **Drag to 0-30** → Should show "Triads"
2. **Drag to 30-70** → Should show "7ths"
3. **Drag to 70-95** → Should show "9ths/11ths"
4. **Drag to 95-100** → Should show "13ths"
5. **Release slider** → Should auto-generate progression

### Quality Slider
1. **Position 0** → Shows "○ Experimental" (gray)
2. **Position 1** → Shows "◐ Fair" (purple)
3. **Position 2** → Shows "★ Good" (amber)
4. **Position 3** → Shows "★★ Excellent" (cyan)
4. **Position 4** → Shows "★★★ Perfect" (green)
5. **Release slider** → Should auto-generate progression

---

## Responsive Design Tests

### Desktop (1400px+)
- [ ] All sections side-by-side in 2-column grid
- [ ] Piano keyboard full width
- [ ] Progression Builder full width
- [ ] No horizontal scrolling

### Tablet (768-1024px)
- [ ] 2-column grids collapse to 1 column
- [ ] Header stacks vertically
- [ ] Everything still readable

### Mobile (<768px)
- [ ] All sections stack vertically
- [ ] Buttons at least 44x44px
- [ ] Text readable at 16px base
- [ ] No horizontal scrolling
- [ ] Touch targets easy to tap

---

## Solar System Toggle Tests

### Show Full View
1. Click "Show Full View" button in Step 2
2. **Should:**
   - [ ] Hide main workflow
   - [ ] Hide header
   - [ ] Show full solar system
   - [ ] Display "← Back to Workflow" button

### Back to Workflow
1. Click "← Back to Workflow" in solar system
2. **Should:**
   - [ ] Show main workflow
   - [ ] Show header
   - [ ] Hide solar system
   - [ ] Return to previous scroll position

---

## Data Flow Tests

### Numbers → Everything
1. Generate numbers (e.g., 7 2 4 3)
2. **Should update:**
   - [ ] Number display (Step 1)
   - [ ] Container Chord Finder bubbles (Step 3)
   - [ ] Progression Builder input degrees (Step 4)

### Scale → Everything
1. Change scale (e.g., C Major → D Dorian)
2. **Should update:**
   - [ ] Header shows "D Dorian"
   - [ ] Piano keyboard highlights new scale
   - [ ] Number Generator shows new notes
   - [ ] Circle explorer adjusts
   - [ ] All chord analysis updates

### Chord Selection → Piano
1. Go to Container Chord Finder
2. Click a note bubble
3. Click a chord result
4. **Should:**
   - [ ] Piano highlights chord notes
   - [ ] Selected chord has colored border
   - [ ] Chord info displays

### Progression → Display
1. Generate progression in Step 4
2. **Should show:**
   - [ ] Chord cards with blue degree badges
   - [ ] Colored left border by grade (green/cyan/amber/purple/gray)
   - [ ] Grade symbols (★★★/★★/★/◐/○)

---

## Key/Scale Selector Tests

### Change Button
1. Click "Change" button in header
2. **Should:**
   - [ ] Cycle through keys: C → G → D → A → E → F → Bb → Eb → C
   - [ ] Update display immediately
   - [ ] Trigger scale change in all modules

---

## Browser Compatibility

Test in multiple browsers:

### Chrome/Edge
- [ ] All features work
- [ ] Sliders smooth
- [ ] Animations fluid

### Firefox
- [ ] All features work
- [ ] Sliders styled correctly
- [ ] Animations work

### Safari (if available)
- [ ] All features work
- [ ] Sliders work
- [ ] Animations work

---

## Performance Tests

### Generation Speed
- [ ] Number generation < 100ms
- [ ] Scale change < 200ms
- [ ] Chord analysis < 500ms
- [ ] Progression generation < 1s

### No Lag
- [ ] Slider dragging smooth
- [ ] No jank when scrolling
- [ ] Animations don't stutter
- [ ] Page doesn't freeze

---

## Console Error Check

1. Open DevTools (F12)
2. Go to Console tab
3. Perform all actions above
4. **Should have:**
   - [ ] Zero errors (red text)
   - [ ] Zero warnings (yellow text)
   - [ ] Only info/debug logs (if any)

---

## Accessibility Quick Check

### Keyboard Navigation
- [ ] Tab key moves through controls
- [ ] Enter/Space activates buttons
- [ ] Arrow keys work on sliders
- [ ] No keyboard traps

### Screen Reader (if available)
- [ ] Buttons have accessible names
- [ ] Sliders have labels
- [ ] Sections have headings

---

## Edge Cases

### Empty State
- [ ] Load page → No errors with empty numbers
- [ ] Clear numbers → Tools handle gracefully

### Maximum Length
- [ ] Generate 16 numbers → All display
- [ ] Long progression → Wraps correctly

### Rapid Clicking
- [ ] Click generate 10 times fast → No errors
- [ ] Spam slider → No lag or errors

---

## Visual Regression Check

Compare before/after screenshots:

### Before (Solar System):
- Complex orbital layout
- 2D pad control
- Tools scattered

### After (Linear Workflow):
- Clear 4-step flow
- Simple sliders
- Organized sections

**Both should have same functionality, just better organized!**

---

## Sign-Off Checklist

When all tests pass:

- [ ] All basic functionality works
- [ ] Visual feedback displays
- [ ] Responsive design works
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Solar system toggle works
- [ ] Data flows correctly

**If all checked: DEPLOYMENT READY! 🚀**

---

## Troubleshooting

### If something doesn't work:

1. **Hard refresh:** Ctrl+Shift+R (clear cache)
2. **Check console:** Look for error messages
3. **Check file paths:** All scripts loaded?
4. **Check browser:** Try different browser
5. **Check version:** Using latest HTML file?

### Common Issues:

**Sliders don't move:**
- Check browser supports `<input type="range">`
- Check CSS isn't hiding them

**Sections don't highlight:**
- Check `.workflow-section.active` CSS exists
- Check `highlightWorkflowSection()` method present

**Solar system toggle doesn't work:**
- Check `#solar-system-full-view` element exists
- Check `setupSolarSystemToggle()` method called

---

## Reporting Issues

If you find bugs, note:
1. What you did (steps to reproduce)
2. What you expected
3. What actually happened
4. Browser and version
5. Console errors (if any)

Example:
```
Steps: 
1. Loaded page
2. Changed scale to D Dorian
3. Clicked generate

Expected: Numbers update
Actual: Error in console
Browser: Chrome 120
Error: "Cannot read property 'map' of undefined"
```

---

## Success Criteria

✅ **All tests pass** → Ready for users!
⚠️ **Some tests fail** → Review and fix issues
❌ **Major tests fail** → Rollback and debug

**Good luck testing! 🎉**

---

## Automated Tests (Optional)

You can run the integration tests that exercise all modules together.

### In Browser (easiest)
- Add this tag near the end of `modular-music-theory.html` (after other scripts):
   ```html
   <script src="test-integration.js"></script>
   ```
- Reload the page and open DevTools Console to see results.

### In Node.js (headless)
- Requires Node 18+.
- Example PowerShell commands from repo root:
   ```powershell
   node -e "const M=require('./music-theory-engine.js'); const N=require('./number-generator.js'); const S=require('./scale-library.js'); const P=require('./piano-visualizer.js'); const C=require('./chord-analyzer.js'); const B=require('./progression-builder.js'); const T=require('./test-integration.js'); new T();"
   ```
   Notes:
   - Modules provide `module.exports` shims for Node.
   - Some visual components are no-ops in Node but tests still validate logic.

### Targeted Debug Helpers
- Chord alias tests in browser console:
   ```javascript
   var s=document.createElement('script'); s.src='tools/chord_tests.js'; document.head.appendChild(s);
   // then run
   __chordTests.runAll()
   ```

## Validation Scripts (Optional)

Run citation/link validation for scale references.

```powershell
node tools/validate-citations.js
```

Outputs:
- `validation/citation-report.json`
- `validation/citation-report.md`

These checks are network-based and can be skipped if you’re offline.
