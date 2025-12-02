function createFinalProjectSlides() {
  var presentation = SlidesApp.getActivePresentation();
  var slides = presentation.getSlides();

  // Preserve existing slides and any images. We will
  // update placeholders in-place and create missing slides by index.

  // Helper: reuse slide at index if present; otherwise append with layout
  function getOrCreateSlideAt(index, layout) {
    var all = presentation.getSlides();
    if (all.length > index) {
      // Reuse existing slide WITHOUT changing layout to avoid disrupting media
      return all[index];
    }
    // Append new slides until we reach index
    while (presentation.getSlides().length <= index) {
      presentation.appendSlide(layout || SlidesApp.PredefinedLayout.TITLE_AND_BODY);
    }
    return presentation.getSlides()[index];
  }

  function setNotes(slide, text) {
    try {
      slide.getNotesPage().getSpeakerNotesShape().getText().setText(text);
    } catch (e) {
      // ignore if notes shape missing
    }
  }

  // --- SLIDE 1: TITLE ---
  var slide1 = getOrCreateSlideAt(0, SlidesApp.PredefinedLayout.TITLE);
  var titleElement = slide1.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
  var subElement = slide1.getPlaceholder(SlidesApp.PlaceholderType.SUBTITLE);
  if (titleElement) titleElement.asShape().getText().setText("Algorithmic Harmony: Composing with the Modular Music Theory System (v11)");
  if (subElement) subElement.asShape().getText().setText("From Kircher's Arca Musarithmica to Modern JavaScript\nBy Parker Chace");
  setNotes(slide1,
    "Opening: One-line purpose — use algorithms as creative partners, not replacements.\n" +
    "Today I'll show a working system (v11) that helps me generate, analyze, and arrange harmony in real time.\n" +
    "Roadmap: brief history → architecture → core modules → harmony tools → a short piece.\n" +
    "Key idea: understanding the numbers behind harmony lets us shape emotion on purpose."
  );

  // --- SLIDE 2: ALL MUSIC IS ALGORITHMIC ---
  var slide2 = getOrCreateSlideAt(1, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide2, SlidesApp.PlaceholderType.TITLE, "All Music is Algorithmic");
  safeSetText(slide2, SlidesApp.PlaceholderType.BODY,
    "The Mathematical Foundation of Harmony\n" +
    "\n• Major 7th chord = 4 + 3 + 4 semitones\n" +
    "• Minor 7th chord = 3 + 4 + 3 semitones\n" +
    "• Diminished chord = 3 + 3 semitones\n" +
    "\nCentral Thesis: By understanding music's underlying mathematical structure, we can intentionally shape emotional impact."
  );
  setNotes(slide2,
    "Set context: chords are numeric patterns (briefly read bullets).\n" +
    "Bridge: if harmony is code, we can refactor it — explore options we wouldn't reach by habit.\n" +
    "Promise: the app exposes these options visually and sonically, then helps commit them into notation and MIDI."
  );

  // --- SLIDE 3: ORNITHOLOGY (SPECTROGRAM) ---
  var slide3 = getOrCreateSlideAt(2, SlidesApp.PredefinedLayout.TITLE_AND_TWO_COLUMNS);
  safeSetText(slide3, SlidesApp.PlaceholderType.TITLE, "The Many Songs We Sing: Lessons from Birdsong");
  safeSetText(slide3, SlidesApp.PlaceholderType.BODY,
    "Birds evolved countless vocalizations for different purposes:\n" +
    "• Mate attraction and territorial defense\n" +
    "• Alarm calls and survival signals\n" +
    "• Individual expression and identity\n\n" +
    "Musicians, too, express across contexts: artistic individualism, service to others, lament, celebration.\n\n" +
    "This tool expands what's possible — keeping alive the exploratory tradition of those who came before us."
  );
  // Preserve any existing right-column media; do not overwrite with placeholder text
  setNotes(slide3,
    "Analogy: spectrograms map shape→meaning in birdsong; my visualizers play the same role for harmony.\n" +
    "Point: specific shapes communicate specific functions — we want visual confirmation that our harmony matches our intent.\n" +
    "Transition: from natural signals to historical tools that formalized musical combination."
  );

  // --- SLIDE 4: HISTORY (KIRCHER) ---
  var slide4 = getOrCreateSlideAt(3, SlidesApp.PredefinedLayout.TITLE_AND_TWO_COLUMNS);
  safeSetText(slide4, SlidesApp.PlaceholderType.TITLE, "Historical Precedent: The First 'Music Computer' (1650)");
  safeSetText(slide4, SlidesApp.PlaceholderType.BODY,
    "Athanasius Kircher's Arca Musarithmica\n\n" +
    "Vision: Enable the 'amusikos' (non-musician) to compose polyphony\n" +
    "Method: Combinatorial system using wooden rods\n" +
    "Philosophy: 'Numerus Sonorus' — the concept of sounding number"
  );
  // Preserve any existing right-column media; do not overwrite
  setNotes(slide4,
    "History: Kircher's Arca Musarithmica — a combinatorial engine for composition.\n" +
    "Thesis link: 'sounding number' becomes interactive number in v11.\n" +
    "Segway: let me show the modern pipeline that realizes this with a DAW, a plugin, a server, and the browser."
  );

  // --- SLIDE 5: SYSTEM OVERVIEW (v11) ---
  var slide5 = getOrCreateSlideAt(4, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide5, SlidesApp.PlaceholderType.TITLE, "System Architecture (v11): DAW → VST3 → Server → Web");
  safeSetText(slide5, SlidesApp.PlaceholderType.BODY,
    "Complete Integration Pipeline:\n" +
    "• VST3 Bridge (C++): Captures MIDI in real-time; batches chords per measure\n" +
    "• Python FastAPI Server: MIDI routing via mido/python-rtmidi\n" +
    "• Web Application (JavaScript): Real-time analysis, visualization, and notation\n\n" +
    "Current Status: Code complete; built with VST3 SDK and curl (vcpkg)\n" +
    "[INSERT ARCHITECTURE DIAGRAM FROM SYSTEM_ARCHITECTURE.md]"
  );
  setNotes(slide5,
    "Say the flow left→right: DAW plays → VST3 batches → HTTP → FastAPI → MIDI out + browser visuals.\n" +
    "Assurance: audio thread never blocks — HTTP happens off-thread.\n" +
    "Outcome: live notation + analysis with <20ms perceived latency.\n" +
    "If diagram visible: quickly point to each component once."
  );

  // --- SLIDE 6: WHAT'S NEW IN v11 UI ---
  var slide6 = getOrCreateSlideAt(5, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide6, SlidesApp.PlaceholderType.TITLE, "Version 11 UI Enhancements (November 2025)");
  safeSetText(slide6, SlidesApp.PlaceholderType.BODY,
    "• Streamlined 4-step workflow: Input → Visualize → Analyze → Build\n" +
    "• Enhanced Progression Builder: 2D pad with Complexity and Quality sliders\n" +
    "• Improved visual feedback: Status badges, flow arrows, interactive highlights\n" +
    "• Mobile-responsive design: Optimized breakpoints, touch targets, adaptive layout\n" +
    "[INSERT SCREENSHOT: modular-music-theory.html]"
  );
  setNotes(slide6,
    "Motivation: shorter time-to-first-action, clearer flow.\n" +
    "Callouts: badges show updates, arrows show data movement, sliders replace fiddly gestures.\n" +
    "Benefit: no loss of power — just better defaults and learnability."
  );

  // --- SLIDE 7: CORE MODULES ---
  var slide7 = getOrCreateSlideAt(6, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide7, SlidesApp.PlaceholderType.TITLE, "Core Input and Visualization Modules");
  safeSetText(slide7, SlidesApp.PlaceholderType.BODY,
    "• Number Generator: Bias-free motif seed generation with preferred note constraints\n" +
    "• Scale Library: Comprehensive modes and keys with global selector\n" +
    "• Piano Visualizer: Live highlighting with dynamic key range fitting\n" +
    "• Scale Circle Explorer: Interactive degree mapping and selection interface\n" +
    "[INSERT COMPOSITE SCREENSHOT: Left column modules]"
  );
  setNotes(slide7,
    "Demo cue: generate a short degree sequence; show preferred notes.\n" +
    "Point to scale library and set a key; note global propagation.\n" +
    "Tap a degree to show the piano visualizer lighting the exact tones."
  );

  // --- SLIDE 8: HARMONY TOOLS ---
  var slide8 = getOrCreateSlideAt(7, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide8, SlidesApp.PlaceholderType.TITLE, "Advanced Harmony Analysis Tools");
  safeSetText(slide8, SlidesApp.PlaceholderType.BODY,
    "• Unified Chord Explorer: Radial substitution interface organized by harmonic families\n" +
    "• Container Chord Finder: Discovers chords containing specific notes for smooth voice leading\n" +
    "• Progression Builder: Fine-tune harmonic complexity and chord quality via intuitive sliders\n" +
    "• Sheet Music Generator: SVG-based notation with grand staff option and per-measure rendering\n" +
    "[INSERT SCREENSHOT: Right column modules]"
  );
  setNotes(slide8,
    "Explain roles: Explorer = alternatives, Container = target-note bridges, Builder = commit choices, Sheet Music = see/play/export.\n" +
    "Promise: each tool updates the others — coherent, fast iteration."
  );

  // --- SLIDE 9: UNIFIED CHORD EXPLORER (RESEARCH) ---
  var slide9 = getOrCreateSlideAt(8, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide9, SlidesApp.PlaceholderType.TITLE, "Unified Chord Explorer: Research-Informed Design");
  safeSetText(slide9, SlidesApp.PlaceholderType.BODY,
    "• 15+ substitution types organized by harmonic family (dominant, secondary, tonic, modal, extension, mediant)\n" +
    "• Intelligent harmonic distance sorting with collision-free radial layout\n" +
    "• Contextual tooltips explaining voice-leading rationale\n" +
    "• Theory-based presets: Functional, Voice Leading, Chromatic Tension, Jazz, Classical, Neo-Riemannian\n" +
    "[INSERT RADIAL MENU SCREENSHOT]"
  );
  setNotes(slide9,
    "Show families by color; say: dominant, secondary, tonic, modal, extension, mediant.\n" +
    "Mention harmonic distance sorting and collision-free layout.\n" +
    "Call out presets: switch perspective without changing the music.\n" +
    "Teaching cue: hover tooltips explain 'why' (voice-leading)."
  );

  // --- SLIDE 10: CONTAINER/PASSING WORKFLOW ---
  var slide10 = getOrCreateSlideAt(9, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide10, SlidesApp.PlaceholderType.TITLE, "Creating Smooth Voice Leading with Container Logic");
  safeSetText(slide10, SlidesApp.PlaceholderType.BODY,
    "Challenge: Connect Cmaj7 → Dm7 smoothly\n" +
    "Constraint: Incorporate C♯ as chromatic bridge note\n" +
    "Solution: C♯dim7 (Passing diminished) — Quality Rating: ★★★\n" +
    "[INSERT CONTAINER TOOL SCREENSHOT]"
  );
  setNotes(slide10,
    "Define the task, then set the constraint (C♯ as bridge).\n" +
    "Click a suggested chord; note the ★ grading and why it’s 'Perfect'.\n" +
    "Explain: container logic = 'find chords that contain the right atoms'."
  );

  // --- SLIDE 11: SHEET MUSIC + MIDI/DAW ---
  var slide11 = getOrCreateSlideAt(10, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide11, SlidesApp.PlaceholderType.TITLE, "Professional Integration: Sheet Music and DAW Connectivity");
  safeSetText(slide11, SlidesApp.PlaceholderType.BODY,
    "• Real-time notation with proper key signatures, accidentals, and grand staff support\n" +
    "• Per-measure rendering with complete voice storage per chord\n" +
    "• Integrated controls: ▶ Play, ■ Stop, ⇄ Send to Bitwig, 💾 Export MIDI\n" +
    "• FastAPI server with loopMIDI routing to DAW and hardware instruments\n" +
    "[INSERT SHEET MUSIC UI + 'Send to Bitwig' BUTTON SCREENSHOT]"
  );
  setNotes(slide11,
    "Point to: key signature, accidentals, grand staff toggle, per-bar capture.\n" +
    "Demo cue: press 'Send to Bitwig' (server must be running) and hear sustained chords.\n" +
    "Note: also save MIDI from the browser for documentation."
  );

  // --- SLIDE 12: GENERATING A MOTIF (REPRO) ---
  var slide12 = getOrCreateSlideAt(11, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide12, SlidesApp.PlaceholderType.TITLE, "Case Study: Generating a Reproducible Motif");
  safeSetText(slide12, SlidesApp.PlaceholderType.BODY,
    "Process: Random generation constrained to scale degrees\n" +
    "Generated Sequence: 2 – 7 – 2 – 7 – 2 – 1\n" +
    "In C Major: D – B – D – B – D – C\n" +
    "[INSERT NUMBER GENERATOR SCREENSHOT]"
  );
  setNotes(slide12,
    "Explain constraints to show it’s not arbitrary RNG — it's reproducible within a musical frame.\n" +
    "State how preferred notes steer character while leaving surprise intact."
  );

  // --- SLIDE 13: HARMONIZING THE MOTIF ---
  var slide13 = getOrCreateSlideAt(12, SlidesApp.PredefinedLayout.TITLE_AND_TWO_COLUMNS);
  safeSetText(slide13, SlidesApp.PlaceholderType.TITLE, "Harmonizing the Generated Motif");
  safeSetText(slide13, SlidesApp.PlaceholderType.BODY,
    "Analysis: D–B forms a sixth interval\n" +
    "Harmonic Choice: Dm6 (D–F–A–B) precisely matches the intervallic structure\n" +
    "Aesthetic Result: Non-functional jazz color that supports motif identity"
  );
  // Preserve any existing right-column media; do not overwrite
  setNotes(slide13,
    "Walk the logic: interval → chord that contains both → color outcome.\n" +
    "Compare to a 'default' V chord to highlight the aesthetic difference.\n" +
    "If time: try one substitution from the radial menu and re-render."
  );

  // --- SLIDE 14: FINAL PIECE ---
  var slide14 = getOrCreateSlideAt(13, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide14, SlidesApp.PlaceholderType.TITLE, "The Completed Composition");
  safeSetText(slide14, SlidesApp.PlaceholderType.BODY,
    "Title: [Insert Composition Title]\n" +
    "Instrumentation: [Insert Instrumentation Details]\n\n" +
    "[INSERT AUDIO PLAYBACK ICON/LINK]\n" +
    "[INSERT SCORE EXCERPT]"
  );
  setNotes(slide14,
    "Listening guide: spot the 2–7 motif, the passing diminished links, and at least one substitution from the explorer.\n" +
    "Invite: notice how interval math supports the emotional arc."
  );

  // --- SLIDE 15: CONCLUSION + NEXT ---
  var slide15 = getOrCreateSlideAt(14, SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  safeSetText(slide15, SlidesApp.PlaceholderType.TITLE, "Conclusion and Future Development");
  safeSetText(slide15, SlidesApp.PlaceholderType.BODY,
    "Core Insight: This tool doesn't compose music — it illuminates possibilities.\n\n" +
    "Planned Enhancements:\n" +
    "• Audio preview on hover within radial substitution menu\n" +
    "• Nested family layers for dense substitution exploration\n" +
    "• Interactive onboarding tour with collapsible advanced features\n" +
    "• Performance optimization through lazy-loading of complex views"
  );
  setNotes(slide15,
    "Summarize: tool widens choices; musician still chooses.\n" +
    "What’s next: previews on hover, denser radial layers, onboarding, performance polish.\n" +
    "Close with invitation: happy to share the repo and build steps if you want to try it."
  );

  // Done
}

// Helper
function safeSetText(slide, placeholderType, text) {
  var placeholder = slide.getPlaceholder(placeholderType);
  if (placeholder) placeholder.asShape().getText().setText(text);
}