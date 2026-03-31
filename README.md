# Music Theory Studio

A compact, browser-based collection of modular music-theory tools for exploration, practice, and lightweight composition. This project bundles interactive visualizers, scale and chord utilities, simple audio/MIDI helpers, and educational examples — intended for learning and experimentation rather than professional DAW production.

Live demo: [Music Theory Studio Live](https://parkerchace.github.io/MusicTheory/modular-music-theory.html)

What this repository is
- A set of client-side JavaScript modules and HTML/CSS that run in a browser.
- Tools and examples for exploring scales, chords, progressions, and simple audio visualization.
- A learning-oriented project: good for demonstrations, classroom examples, and personal study.

What this repository is not
- Not a commercial, fully featured DAW or audio production suite.
- Not a substitute for formal music instruction or professional composition tools.

Quick start
1. Open `modular-music-theory.html` in a modern browser (Chrome/Edge/Firefox).
2. Use the top controls to select scales, enable demo/help overlays, and open modules.
3. For development, open the `*.js` files and run a local static server (or open the HTML directly).

Development notes
- The project is modular: each feature is implemented in its own `*.js` file (see file list below).
- Some scale validation and citation tooling is present; not all scales are fully verified. Expect ongoing refinement.
- If you edit code, keep changes focused and run the UI to confirm behavior — this project runs in the browser and has no build step.

File highlights
- `modular-music-theory.html` — main demo HTML
- `music-theory-engine.js` — core scale and chord calculations
- `scale-library.js`, `scale-intelligence-engine.js` — scale data and selection helpers
- `unified-chord-explorer.js`, `progression-builder.js` — chord/progression UI tools
- `piano-visualizer.js`, `sheet-music-generator.js` — visualization and notation helpers

Contributing
- Bug reports and small fixes welcome. Open an issue or submit a pull request with a clear description and steps to reproduce.
- For larger changes or data contributions (scale definitions, citations), open an issue first so we can coordinate format and validation.

License
- This project is provided for educational use. See the repository license file for details.

Legal
- **Common-property musical elements:** Common musical elements such as scales, arpeggios, chord charts, and short musical examples are treated as common-property elements and are not protected as copyrightable works under U.S. copyright law (see the U.S. Copyright Office guidance: https://www.copyright.gov/comp3/chap800/ch800-musical-works.pdf)

- **Keys, scales, and intervals:** Keys and other basic musical parameters (for example, scales and intervals) are basic building blocks of music and are not in themselves copyrightable; see: https://www.copyright.gov/comp3/chap300/ch300-copyrightable-authorship.pdf

- **If you prefer removal:** If you would like any your material removed from this repository, please contact me at sparkerchace@gmail.com and I will remove anything you're not comfortable with me using. No questions asked — this project is intended as an educational tool, not to cause stress for any community.

Contact
- Parker Chace — sparkerchace@gmail.com

Thank you for exploring this project. Contributions that improve accuracy, documentation, and accessibility are especially appreciated.
