/**
 * approach-engine.js  (v2 — combinatorial catalog)
 *
 * Builds a large catalog of ways to approach a target chord from outside the
 * home scale, then picks one weighted by tension/energy/tone and the user's
 * harmonic-color complexity setting. Every inserted chord carries a scaleHint
 * so the melody generator, scale timeline and explanation toasts follow the
 * borrowed scale automatically.
 *
 * Families (typically 100–150 distinct plans per target):
 *  - dominant   V7 / tritone-sub / backdoor roots × qualities (7, 9, 13, 7sus4,
 *               7b9→octatonic, 7b13→mixolydian b6, 7#11), each solo or with its
 *               related ii (ii–V cells)
 *  - planing    dim7 / target-quality / m7 / maj7 / 7 chords sliding in from
 *               above/below/enclosure, 1–3 steps, chromatic or whole-step,
 *               plus the octatonic dim7 overshoot (Bdim7→Cdim7→Ddim7→Cmaj7)
 *  - pivot      walks borrowed from any scale that contains the target chord
 *               (major, dorian, phrygian, lydian, mixolydian, aeolian,
 *               harmonic minor/major, mixolydian b6) × direction × length
 *  - chain      V/V→V7 and iiø→V7b9 two-step cells
 */

class ApproachEngine {
    constructor(musicTheory) {
        this.mt = musicTheory || null;
        this.chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        // Half-whole diminished; matches the embedded dataset's "octatonic" id.
        this.octatonicIntervals = [0, 1, 3, 4, 6, 7, 9, 10];
        this._catalogCache = {};
        this.lastCatalogSize = 0;
    }

    // ---------- primitives ----------

    transpose(root, semitones) {
        const clean = String(root || 'C').replace(/\d+$/, '');
        if (this.mt && typeof this.mt.transposeNote === 'function') {
            const t = this.mt.transposeNote(clean, semitones);
            if (t) return t;
        }
        const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
        const norm = flatMap[clean] || clean;
        const idx = this.chromatic.indexOf(norm);
        if (idx === -1) return clean;
        return this.chromatic[(((idx + semitones) % 12) + 12) % 12];
    }

    pitchValue(note) {
        const pc = String(note || '').replace(/\d+$/, '');
        if (this.mt && this.mt.noteValues && Number.isFinite(this.mt.noteValues[pc])) return this.mt.noteValues[pc];
        const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
        return this.chromatic.indexOf(flatMap[pc] || pc);
    }

    scaleNotes(root, scaleName) {
        // GUARD: the theory engine falls back to the MAJOR scale for any id it
        // does not know, and returns it without complaint. That means an
        // unknown scale id yields major notes *labelled as the requested
        // scale* — provenance that reads authoritative and is simply false.
        // Verify the returned notes actually match the id's own intervals.
        const verify = (notes) => {
            if (!Array.isArray(notes) || !notes.length) return null;
            const src = (typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals)
                ? window.SCALES.intervals : (this.mt && this.mt.scales) || {};
            const iv = src[scaleName];
            if (!Array.isArray(iv) || !iv.length) return null;   // unknown id → refuse
            if (notes.length !== iv.length) return null;
            const rootPc = this.pitchValue(root);
            if (!Number.isFinite(rootPc)) return notes;
            const want = new Set(iv.map(x => ((rootPc + x) % 12 + 12) % 12));
            const got = notes.map(n => this.pitchValue(n)).filter(Number.isFinite);
            if (got.length !== notes.length) return null;
            return got.every(pc => want.has(pc)) ? notes : null;
        };
        if (this.mt) {
            try {
                if (typeof this.mt.getScaleNotesWithKeySignature === 'function') {
                    const n = verify(this.mt.getScaleNotesWithKeySignature(root, scaleName));
                    if (n) return n;
                }
                if (typeof this.mt.getScaleNotes === 'function') {
                    const n = verify(this.mt.getScaleNotes(root, scaleName));
                    if (n) return n;
                }
            } catch (_) {}
        }
        if (scaleName === 'octatonic') {
            const idx = Math.max(0, this.chromatic.indexOf(this.transpose(root, 0)));
            return this.octatonicIntervals.map(i => this.chromatic[(idx + i) % 12]);
        }
        return null;
    }

    chordNotes(root, chordType) {
        if (this.mt && typeof this.mt.getChordNotes === 'function') {
            try { return this.mt.getChordNotes(root, chordType) || []; } catch (_) {}
        }
        return [];
    }

    fullName(root, chordType) {
        if (chordType === 'maj') return String(root);
        return `${root}${chordType}`;
    }

    prettyScale(name) {
        const id = String(name || '');
        const meta = (typeof window !== 'undefined' && window.SCALES && window.SCALES.meta) || {};
        const base = (meta.displayNames && meta.displayNames[id])
            ? meta.displayNames[id]
            : id.replace(/_/g, ' ')
                .replace(/\bb(\d+)/g, '♭$1')
                .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
        return base + this.scaleQualifier(id);
    }

    /**
     * "Octatonic" alone is ambiguous, and the ambiguity is the whole reason a
     * 7♭9 tagged "Octatonic" reads as a mistake: stacked in thirds this scale
     * gives dim7 chords at every degree, so a dominant looks impossible. It is
     * the half-whole rooting that holds 1 ♭9 3 5 ♭7. Say which one, derived
     * from the id's own intervals rather than from its name.
     */
    scaleQualifier(scaleId) {
        const src = (typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals)
            ? window.SCALES.intervals
            : ((this.mt && this.mt.scales) || {});
        const iv = src[scaleId];
        if (!Array.isArray(iv) || iv.length !== 8) return '';
        const steps = iv.map((v, i) => (((iv[(i + 1) % 8] - v) % 12) + 12) % 12);
        const key = steps.join('');
        if (key === '12121212') return ' (H‑W)';
        if (key === '21212121') return ' (W‑H)';
        return '';
    }

    /**
     * Respell `notes` in the same accidentals as `reference`. The engine spells
     * Bb Dorian with flats no matter what, so a run labelled "A#m7" printed its
     * source as "Bb C Db Eb F G Ab" — identical pitches, two alphabets, and the
     * provenance reads like a contradiction.
     */
    matchSpelling(notes, reference) {
        if (!Array.isArray(notes) || !notes.length) return notes;
        const ref = String(reference || '');
        const wantFlat = ref.includes('b');
        const wantSharp = ref.includes('#');
        if (!wantFlat && !wantSharp) return notes;
        const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        return notes.map(n => {
            const pc = this.pitchValue(n);
            if (!Number.isFinite(pc) || pc < 0) return n;
            return wantFlat ? flats[pc] : sharps[pc];
        });
    }

    /**
     * Every pitch of `root+chordType` present in `scaleRoot scaleName`?
     * Provenance claims get checked against the data before they are printed.
     */
    chordFitsScale(root, chordType, scaleRoot, scaleName) {
        const notes = this.chordNotes(root, chordType);
        const sn = this.scaleNotes(scaleRoot, scaleName);
        if (!notes.length || !sn || !sn.length) return false;
        const set = new Set(sn.map(n => this.pitchValue(n)));
        return notes.every(n => set.has(this.pitchValue(n)));
    }

    makeEvent(root, chordType, roman, duration, scaleRoot, scaleName, reason, explain) {
        const notes = this.chordNotes(root, chordType);
        let hintNotes = scaleName ? this.scaleNotes(scaleRoot, scaleName) : null;
        // Print the source scale in the chord's own accidentals.
        if (hintNotes) hintNotes = this.matchSpelling(hintNotes, root);
        return {
            root,
            chordType,
            chordNotes: notes,
            diatonicNotes: notes,
            fullName: this.fullName(root, chordType),
            roman,
            duration,
            scaleHint: (hintNotes && hintNotes.length) ? { root: scaleRoot, scaleName, scaleNotes: hintNotes, reason } : null,
            explain: explain || null
        };
    }

    /**
     * A chord quality a musician would actually read. The classifier describes
     * whatever notes it is handed, so stacking thirds on an exotic scale can
     * return things like "sus2(add11, b13, #5)" — a true description of the
     * pitches and not a usable chord symbol.
     */
    isPlainQuality(chordType) {
        const q = String(chordType || '').trim();
        if (!q) return false;
        if (/[(),]/.test(q)) return false;                  // compound description
        // Single-alteration symbols (maj7#5, 7b5) are readable and are what the
        // harmonic-minor family legitimately produces; the pivot family already
        // emits them, so excluding them here would have made the two families
        // disagree about what counts as diatonic.
        return /^(maj|maj7|maj9|maj13|maj7#5|m|m7|m9|m11|m6|m7#5|m7b5|mMaj7|7|9|11|13|6|7b5|7#5|dim|dim7|aug|sus2|sus4|7sus4)$/.test(q);
    }

    /** True when every degree of this scale names a readable chord quality. */
    allDegreesPlain(scaleRoot, scaleId, degreeCount) {
        const key = `${scaleRoot}|${scaleId}|${degreeCount}`;
        this._plainScaleCache = this._plainScaleCache || {};
        if (this._plainScaleCache[key] !== undefined) return this._plainScaleCache[key];

        let ok = true;
        for (let d = 1; d <= degreeCount; d++) {
            let c = null;
            try { c = this.mt.getDiatonicChord(d, scaleRoot, scaleId); } catch (_) { ok = false; break; }
            if (!c || !this.isPlainQuality(c.chordType)) { ok = false; break; }
        }
        this._plainScaleCache[key] = ok;
        return ok;
    }

    /** Same pitch-class set, ignoring spelling and order. */
    sameChordNotes(a, b) {
        const norm = (list) => Array.from(new Set((list || [])
            .map(n => this.pitchValue(n)).filter(p => Number.isFinite(p) && p >= 0))).sort().join(',');
        const x = norm(a);
        return x.length > 0 && x === norm(b);
    }

    qualityScaleFor(chordType) {
        const q = String(chordType || '');
        if (/dim7/.test(q)) return 'octatonic';
        if (/m7b5/.test(q)) return 'locrian';
        if (/^m/.test(q)) return 'dorian';
        if (/maj/.test(q)) return 'lydian';
        if (/sus/.test(q) || /7|9|13/.test(q)) return 'mixolydian';
        return 'lydian';
    }

    // ---------- shared-root scale search ----------

    static popcount(m) {
        let c = 0;
        while (m) { m &= m - 1; c++; }
        return c;
    }

    /** Rotate a 12-bit pitch-class set up by `r` semitones. */
    static rotateMask(mask, r) {
        return ((mask << r) | (mask >>> (12 - r))) & 0xFFF;
    }

    /**
     * One-time bitmask index over the whole scale dataset (~1200 usable scales).
     * Searching by mask means the expensive part — getDiatonicChord, which does
     * spelling work — only runs on the handful of candidates that survive
     * ranking, instead of on 1198 scales x 12 roots.
     *
     * `rank` prefers the dataset's own essential/base scales, so when several
     * ids describe the same pitch-class set we keep the most familiar name.
     */
    scaleMaskIndex() {
        if (this._maskIndex) return this._maskIndex;
        const src = (typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals)
            ? window.SCALES.intervals
            : ((this.mt && this.mt.scales) || {});
        const meta = (typeof window !== 'undefined' && window.SCALES && window.SCALES.meta) || {};
        const essential = new Set(meta.essentialScales || []);
        const base = new Set(meta.baseScales || []);

        // A pitch-class set has many true names — {E F# G# A B C# D#} is equally
        // "E major" and "C# aeolian" — and the dedupe keeps only one. Left to an
        // alphabetical tie-break every diatonic collection came back labelled
        // "aeolian", which is correct and useless. These are the names a player
        // actually reaches for, so they win the naming contest for their set.
        const CANONICAL = ['major', 'minor', 'aeolian', 'dorian', 'mixolydian', 'lydian',
            'phrygian', 'locrian', 'harmonic_minor', 'harmonic', 'melodic', 'harmonic_major',
            'octatonic', 'whole_tone', 'altered', 'mixolydian_b6', 'phrygian_dominant',
            'lydian_dominant', 'hungarian_minor', 'double_harmonic_major'];
        const canonRank = new Map(CANONICAL.map((id, i) => [id, i]));

        const index = [];
        for (const [scaleId, intervals] of Object.entries(src)) {
            if (!Array.isArray(intervals) || intervals.length < 5 || intervals.length > 8) continue;
            let mask0 = 0;
            let ok = true;
            for (const iv of intervals) {
                if (!Number.isFinite(iv)) { ok = false; break; }
                mask0 |= 1 << (((iv % 12) + 12) % 12);
            }
            if (!ok || ApproachEngine.popcount(mask0) !== intervals.length) continue;
            index.push({
                scaleId, intervals, mask0,
                size: intervals.length,
                rank: canonRank.has(scaleId) ? -100 + canonRank.get(scaleId)
                    : (essential.has(scaleId) ? 0 : (base.has(scaleId) ? 1 : 2))
            });
        }
        index.sort((a, b) =>
            (a.rank - b.rank) || (a.size - b.size) || String(a.scaleId).localeCompare(String(b.scaleId)));
        this._maskIndex = index;
        return index;
    }

    /**
     * SHARED-ROOT SCALE SEARCH.
     *
     * To approach a chord, find scales that contain a chord built on the SAME
     * ROOT — regardless of quality. Approaching Amaj7, B octatonic qualifies
     * because it contains Adim7: different quality, same root, and the shared
     * notes (A and G#) are what make it land to the ear.
     *
     * Two things keep this from exploding into thousands of near-identical
     * rows. First, candidates are deduped by pitch-class SET: B/D/F/G# octatonic
     * are one collection wearing four names, and the stacked-thirds chord on A
     * is the same Adim7 in all four — so they collapse to one row that lists the
     * others as `altRoots`. Second, results are ranked by how many notes they
     * share with the target chord, so the closest-sounding options come first
     * and the wilder ones stay reachable further down.
     *
     * @returns [{ scaleRoot, scaleId, scaleNotes, degree, pivotChord, shared,
     *             total, altRoots }]
     */
    findScalesWithRootChord(targetRoot, targetChordNotes, { limit = 24, minShared = 1, minSize = 7 } = {}) {
        if (!this.mt || typeof this.mt.getDiatonicChord !== 'function') return [];
        const targetPc = this.pitchValue(targetRoot);
        if (!Number.isFinite(targetPc) || targetPc < 0) return [];

        const targetPcs = Array.from(new Set((targetChordNotes || [])
            .map(n => this.pitchValue(n)).filter(p => Number.isFinite(p) && p >= 0)));
        let targetMask = 0;
        targetPcs.forEach(p => { targetMask |= 1 << p; });
        const total = targetPcs.length || 1;

        const cacheKey = `${targetPc}|${targetMask}|${limit}|${minShared}|${minSize}`;
        this._rootScaleCache = this._rootScaleCache || {};
        if (this._rootScaleCache[cacheKey]) return this._rootScaleCache[cacheKey];

        // --- pass 1: pure bitmask, no note spelling, no chord building ---
        const bySet = new Map();   // pc-set mask -> best-named rooting of that set
        for (const entry of this.scaleMaskIndex()) {
            // Stacked thirds only describe real chords in 7- and 8-note scales.
            // Below that, "every other degree" of a pentatonic yields labels
            // like Amodalmaj7(#11,b5) — noise that would crowd out the useful
            // collections without naming anything a player would reach for.
            if (entry.size < minSize) continue;
            for (let r = 0; r < 12; r++) {
                const mask = ApproachEngine.rotateMask(entry.mask0, r);
                if (!(mask & (1 << targetPc))) continue;          // must contain the target root
                const existing = bySet.get(mask);
                if (existing) {
                    // Same collection, different name/rooting — record and move on.
                    if (existing.altRoots.length < 6
                        && !existing.altRoots.some(a => a.scaleRoot === this.chromatic[r] && a.scaleId === entry.scaleId)) {
                        existing.altRoots.push({ scaleRoot: this.chromatic[r], scaleId: entry.scaleId });
                    }
                    continue;
                }
                const shared = ApproachEngine.popcount(mask & targetMask);
                if (shared < minShared) continue;
                bySet.set(mask, {
                    scaleRoot: this.chromatic[r], scaleId: entry.scaleId,
                    intervals: entry.intervals, rootPc: r, mask, shared, size: entry.size,
                    rank: entry.rank, altRoots: []
                });
            }
        }

        // Ranking is stratified by overlap rather than sorted by it. Straight
        // "most shared first" fills every slot with 4/4 collections and the
        // 2/4 ones — the octatonic-into-Amaj7 case, the whole point of this
        // search — never surface. Bucket by shared count, order each bucket by
        // familiarity, then take round-robin across buckets so the result spans
        // smooth-to-distant and plan() can price the full spice range.
        // Bucket on overlap AND note count: a 7-note bucket ordered by
        // familiarity will always outrank the 8-note collections, so octatonic
        // needs a lane of its own to reach the results at all.
        const buckets = new Map();
        for (const c of bySet.values()) {
            const k = `${c.shared}|${c.size}`;
            if (!buckets.has(k)) buckets.set(k, []);
            buckets.get(k).push(c);
        }
        const order = Array.from(buckets.keys()).sort((a, b) => {
            const [sa, za] = a.split('|').map(Number);
            const [sb, zb] = b.split('|').map(Number);
            return (sb - sa) || (za - zb);
        });
        order.forEach(k => buckets.get(k).sort((a, b) =>
            (a.rank - b.rank) || String(a.scaleId).localeCompare(String(b.scaleId))));

        const ranked = [];
        for (let i = 0; ranked.length < bySet.size; i++) {
            let progressed = false;
            for (const k of order) {
                const list = buckets.get(k);
                if (i < list.length) { ranked.push(list[i]); progressed = true; }
            }
            if (!progressed) break;
        }

        // --- pass 2: build real chords only for the survivors ---
        const out = [];
        for (const cand of ranked) {
            if (out.length >= limit) break;
            const degIdx = cand.intervals.findIndex(iv => (((cand.rootPc + iv) % 12) + 12) % 12 === targetPc);
            if (degIdx < 0) continue;

            const scaleNotes = this.scaleNotes(cand.scaleRoot, cand.scaleId);
            if (!scaleNotes || !scaleNotes.length) continue;

            let pivotChord = null;
            try { pivotChord = this.mt.getDiatonicChord(degIdx + 1, cand.scaleRoot, cand.scaleId); } catch (_) { continue; }
            if (!pivotChord || this.pitchValue(pivotChord.root) !== targetPc) continue;

            out.push({
                scaleRoot: cand.scaleRoot, scaleId: cand.scaleId, scaleNotes,
                degree: degIdx + 1,
                degreeCount: cand.size,
                pivotChord,
                shared: cand.shared,
                total,
                altRoots: cand.altRoots
            });
        }

        this._rootScaleCache[cacheKey] = out;
        return out;
    }

    /**
     * Chord built on scale degree `degree`, respelled so it reads in the same
     * accidentals as the scale it came from. Without this a run borrowed from
     * Bb Dorian gets labelled "A#m7" while the scale beside it prints
     * "Bb C Db Eb F G Ab" — same pitches, contradictory provenance.
     */
    scaleDegreeChord(scaleRoot, scaleId, degree, scaleNotes) {
        let chord = null;
        try { chord = this.mt.getDiatonicChord(degree, scaleRoot, scaleId); } catch (_) { return null; }
        if (!chord || !chord.root) return null;

        const notes = (Array.isArray(chord.chordNotes) && chord.chordNotes.length)
            ? chord.chordNotes : (chord.diatonicNotes || []);

        // Re-spell against the parent scale's own note names.
        const byPc = new Map();
        (scaleNotes || []).forEach(n => {
            const pc = this.pitchValue(n);
            if (Number.isFinite(pc) && pc >= 0 && !byPc.has(pc)) byPc.set(pc, n);
        });
        const respell = (n) => {
            const pc = this.pitchValue(n);
            return byPc.has(pc) ? byPc.get(pc) : n;
        };
        const root = respell(chord.root);
        return {
            ...chord,
            root,
            chordNotes: notes.map(respell),
            diatonicNotes: notes.map(respell),
            fullName: this.fullName(root, chord.chordType)
        };
    }

    // ---------- catalog ----------

    /**
     * @param {Object} target
     * @param {Object} opts
     * @param {number}  opts.maxBeats
     * @param {boolean} opts.diatonicOnly  Only chords that are genuinely a
     *   stacked-thirds degree of their source scale.
     *
     * DIATONIC vs MERELY CONTAINED.
     *
     * These are not the same claim, and conflating them is what produced
     * "G7b9 — borrowed from G Octatonic". Every note of G7♭9 does live in G
     * octatonic, but the scale's own chords — stack thirds on any of its eight
     * degrees — are dim7 without exception. G7♭9 is a chord you can spell from
     * the collection, not a chord the collection generates.
     *
     * The dominant, planing and chain families all build chords by formula
     * (V7, ♭9, tritone sub, chromatic parallel motion) and then look for a
     * scale that happens to contain the result. Under diatonicOnly they are
     * dropped entirely, leaving pivot and sharedRoot, which are built by asking
     * the scale for its degree chord and therefore cannot make this claim
     * falsely.
     */
    buildCatalog(target, { maxBeats = 1.5, diatonicOnly = false } = {}) {
        const key = `${target.root}|${target.chordType || 'maj7'}|${maxBeats}|${diatonicOnly ? 'dia' : 'all'}`;
        if (this._catalogCache[key]) return this._catalogCache[key];

        const plans = [];
        const t = target.root;
        const tq = String(target.chordType || 'maj7');
        const tRoman = target.roman || target.fullName || this.fullName(t, tq);
        const minorTarget = /^m(?!aj)/.test(tq);

        // --- dominant family (formula-built; not scale-derived) ---
        const domDefs = diatonicOnly ? [] : [
            { name: 'V7', semis: 7, spiceBase: 0, quals: [
                ['7', 'mixolydian', 0.18], ['9', 'mixolydian', 0.24], ['13', 'mixolydian', 0.3],
                ['7sus4', 'mixolydian', 0.32], ['7b13', 'mixolydian_b6', 0.42], ['7b9', 'octatonic', 0.55]
            ] },
            { name: 'subV7', semis: 1, spiceBase: 0.28, quals: [
                ['7', 'mixolydian', 0.6], ['7#11', 'mixolydian', 0.68], ['9', 'mixolydian', 0.63]
            ] },
            { name: 'bVII7', semis: -2, spiceBase: 0.2, quals: [
                ['7', 'mixolydian', 0.45], ['9', 'mixolydian', 0.5], ['13', 'mixolydian', 0.53]
            ] }
        ];
        for (const def of domDefs) {
            const domRoot = this.transpose(t, def.semis);
            for (const [qual, scale, spice] of def.quals) {
                // These chord/scale pairings are hand-authored, so verify the
                // chord's notes really do live in the scale before claiming it
                // as the source. A pairing that does not check out still plays,
                // but goes out unattributed rather than with a false parent.
                const fits = this.chordFitsScale(domRoot, qual, domRoot, scale);
                const domEv = () => this.makeEvent(
                    domRoot, qual, `${def.name}/${tRoman}`, 0.5,
                    domRoot, fits ? scale : null, `${def.name}-approach`,
                    `${this.fullName(domRoot, qual)} — ${def.name} into ${target.fullName}` +
                    (fits ? ` (notes drawn from ${domRoot} ${this.prettyScale(scale)})` : '')
                );
                plans.push({ id: `dom:${def.name}:${qual}`, family: 'dominant', spice, beats: 0.5, build: () => [domEv()] });

                // ii–V cell: related ii sits a fifth above the dominant
                const iiRoot = this.transpose(domRoot, 7);
                const iiQual = minorTarget ? 'm7b5' : 'm7';
                const iiScale = minorTarget ? 'locrian' : 'dorian';
                plans.push({
                    id: `dom:${def.name}:${qual}:ii`, family: 'dominant',
                    spice: Math.min(1, spice + 0.08), beats: 1,
                    build: () => [
                        this.makeEvent(iiRoot, iiQual, `ii/${tRoman}`, 0.5, iiRoot, iiScale, 'related-ii',
                            `${this.fullName(iiRoot, iiQual)} → ${this.fullName(domRoot, qual)} — ii–${def.name} cell into ${target.fullName}`),
                        domEv()
                    ]
                });
            }
        }

        // --- planing family (chromatic parallel motion; no parent scale) ---
        // Planing slides a fixed shape by semitone, so its chords belong to no
        // scale degree at all — the scaleHint is a nearest-fit label, not a
        // derivation. Excluded under diatonicOnly.
        const planQuals = [];
        for (const q of (diatonicOnly ? [] : ['dim7', tq, 'm7', 'maj7', '7'])) {
            if (!planQuals.includes(q)) planQuals.push(q);
        }
        const patterns = [
            { id: 'below1', steps: [-1] }, { id: 'below2', steps: [-2, -1] }, { id: 'below3', steps: [-3, -2, -1] },
            { id: 'above1', steps: [1] }, { id: 'above2', steps: [2, 1] }, { id: 'above3', steps: [3, 2, 1] },
            { id: 'enclose', steps: [1, -1] },
            { id: 'wholeBelow', steps: [-2] }, { id: 'wholeAbove', steps: [2] }
        ];
        for (const q of planQuals) {
            for (const pat of patterns) {
                const beats = pat.steps.length * 0.5;
                if (beats > maxBeats) continue;
                const spice = Math.min(1, 0.42 + pat.steps.length * 0.06 + (q === 'dim7' ? 0.14 : 0) + (pat.id === 'enclose' ? 0.06 : 0));
                plans.push({
                    id: `plane:${q}:${pat.id}`, family: 'planing', spice, beats,
                    build: () => {
                        const lead = this.transpose(t, -1);
                        const names = [];
                        const evs = pat.steps.map((s) => {
                            const r = this.transpose(t, s);
                            names.push(this.fullName(r, q));
                            const hintRoot = q === 'dim7' ? lead : r;
                            const hintScale = q === 'dim7' ? 'octatonic' : this.qualityScaleFor(q);
                            return this.makeEvent(r, q, `plane/${tRoman}`, 0.5, hintRoot, hintScale, `${q}-planing`, null);
                        });
                        if (evs.length) evs[0].explain = `${names.join(' → ')} — ${q} planing into ${target.fullName}`;
                        return evs;
                    }
                });
            }
        }
        // The octatonic overshoot: lead-tone dim7, target-root dim7, overshoot, land.
        if (!diatonicOnly && maxBeats >= 1.5) {
            plans.push({
                id: 'plane:dim7:octatonic-overshoot', family: 'planing', spice: 0.72, beats: 1.5,
                build: () => {
                    const lead = this.transpose(t, -1);
                    const roots = [lead, t, this.transpose(t, 2)];
                    const evs = roots.map(r => this.makeEvent(r, 'dim7', `°7/${tRoman}`, 0.5, lead, 'octatonic', 'octatonic-dim-planing', null));
                    evs[0].explain = `${roots.map(r => r + 'dim7').join(' → ')} — ${lead} octatonic planing into ${target.fullName}`;
                    return evs;
                }
            });
        }

        // --- pivot walks: any scale that contains the target chord ---
        if (this.mt && typeof this.mt.getDiatonicChord === 'function' && this.mt.scales) {
            const sourceScales = [
                ['major', 0.25], ['dorian', 0.35], ['mixolydian', 0.35], ['lydian', 0.4],
                ['aeolian', 0.4], ['phrygian', 0.5], ['harmonic_minor', 0.55],
                ['harmonic_major', 0.6], ['mixolydian_b6', 0.65]
            ];
            const tPc = this.pitchValue(t);
            for (const [scaleId, scaleSpice] of sourceScales) {
                const intervals = this.mt.scales[scaleId];
                if (!Array.isArray(intervals) || intervals.length !== 7) continue;
                for (let deg = 1; deg <= 7; deg++) {
                    const srcKey = this.transpose(t, -intervals[deg - 1]);
                    let pivotChord = null;
                    try { pivotChord = this.mt.getDiatonicChord(deg, srcKey, scaleId); } catch (_) {}
                    if (!pivotChord || this.pitchValue(pivotChord.root) !== tPc) continue;
                    if (!this._qualityCompatible(pivotChord.chordType, tq)) continue;

                    for (const dir of [1, -1]) {
                        for (let len = 1; len <= 3; len++) {
                            const beats = len * 0.5;
                            if (beats > maxBeats) continue;
                            plans.push({
                                id: `pivot:${scaleId}@${srcKey}:deg${deg}:${dir > 0 ? 'up' : 'down'}${len}`,
                                family: 'pivot',
                                spice: Math.min(1, scaleSpice + len * 0.04),
                                beats,
                                build: () => {
                                    const evs = [];
                                    const names = [];
                                    for (let s = len; s >= 1; s--) {
                                        const d = ((deg - 1 - dir * s) % 7 + 7) % 7 + 1;
                                        let c = null;
                                        try { c = this.mt.getDiatonicChord(d, srcKey, scaleId); } catch (_) {}
                                        if (!c || !c.root) return null;
                                        const notes = (Array.isArray(c.chordNotes) && c.chordNotes.length) ? c.chordNotes : (c.diatonicNotes || []);
                                        const hintNotes = this.scaleNotes(srcKey, scaleId);
                                        names.push(c.fullName || this.fullName(c.root, c.chordType));
                                        evs.push({
                                            ...c,
                                            chordNotes: notes,
                                            diatonicNotes: notes,
                                            duration: 0.5,
                                            roman: `${c.roman || d}/${srcKey}`,
                                            scaleHint: (hintNotes && hintNotes.length) ? { root: srcKey, scaleName: scaleId, scaleNotes: hintNotes, reason: 'pivot-scale-walk' } : null,
                                            explain: null
                                        });
                                    }
                                    if (evs.length) {
                                        evs[0].explain = `${names.join(' → ')} — borrowed from ${srcKey} ${this.prettyScale(scaleId)} (shares ${target.fullName})`;
                                    }
                                    return evs;
                                }
                            });
                        }
                    }
                }
            }
        }

        // --- shared-root walks: any scale holding a chord on the TARGET'S ROOT ---
        //
        // This is the general form of "B octatonic works into Amaj7". The scale
        // does not have to contain the target chord, and the chord it does hold
        // on that root does not have to match quality — B octatonic offers
        // Adim7, not Amaj7. What makes it land is the shared root plus whatever
        // else overlaps, so plans are priced by exactly that overlap: the fewer
        // notes in common, the spicier the plan is rated.
        //
        // Two shapes per candidate:
        //   walk      neighbouring scale chords lead straight into the target
        //             (F#dim7 -> G#dim7 -> Amaj7)
        //   pivot     the walk lands on the scale's OWN chord at the target root
        //             first, so the quality shift is the last thing you hear
        //             (G#dim7 -> Adim7 -> Amaj7)
        const targetChordNotes = (Array.isArray(target.chordNotes) && target.chordNotes.length)
            ? target.chordNotes
            : this.chordNotes(t, tq);
        const rootScales = this.findScalesWithRootChord(t, targetChordNotes, { limit: 14 });
        for (const cand of rootScales) {
            const { scaleRoot, scaleId, scaleNotes, degree, degreeCount, shared, total } = cand;

            // Stacking thirds on some exotic scales yields collections the
            // classifier can only describe compositionally — Asus2(add11,♭13,#5).
            // Those are degree chords in the literal sense and useless in the
            // practical one: no player reads them, and the sheet's chord parser
            // cannot round-trip the name. Under diatonicOnly, keep only scales
            // where EVERY degree names a readable quality — checking just the
            // chord at the target root still let the walk pass through the
            // unreadable ones on its way there.
            if (diatonicOnly && !this.allDegreesPlain(scaleRoot, scaleId, degreeCount)) continue;

            // Landing on the pivot is only a gesture when the pivot differs
            // from the target. Where the scale's chord at this root IS the
            // target chord, the variant just plays it twice.
            const pivotSameAsTarget = this.sameChordNotes(
                (cand.pivotChord && (cand.pivotChord.chordNotes || cand.pivotChord.diatonicNotes)) || [],
                targetChordNotes);
            // Overlap drives the price: 4/4 shared is a smooth pivot, 1/4 is a
            // deliberate sideways lurch.
            const overlap = shared / (total || 1);
            const baseSpice = Math.max(0.2, Math.min(0.95, 0.3 + (1 - overlap) * 0.5));

            for (const dir of [1, -1]) {
                for (let len = 1; len <= 3; len++) {
                    for (const landOnPivot of (pivotSameAsTarget ? [false] : [false, true])) {
                        const steps = len + (landOnPivot ? 1 : 0);
                        const beats = steps * 0.5;
                        if (beats > maxBeats + 1e-6) continue;

                        plans.push({
                            id: `root:${scaleId}@${scaleRoot}:deg${degree}:${dir > 0 ? 'up' : 'down'}${len}${landOnPivot ? ':pivot' : ''}`,
                            family: 'sharedRoot',
                            spice: Math.min(1, baseSpice + len * 0.03 + (landOnPivot ? 0.05 : 0)),
                            beats,
                            build: () => {
                                const evs = [];
                                const names = [];
                                const push = (deg) => {
                                    const c = this.scaleDegreeChord(scaleRoot, scaleId, deg, scaleNotes);
                                    if (!c) return false;
                                    names.push(c.fullName);
                                    evs.push({
                                        ...c,
                                        duration: 0.5,
                                        roman: `${deg}/${scaleRoot} ${scaleId}`,
                                        scaleHint: {
                                            root: scaleRoot, scaleName: scaleId, scaleNotes,
                                            reason: 'shared-root-scale'
                                        },
                                        explain: null
                                    });
                                    return true;
                                };
                                for (let s = len; s >= 1; s--) {
                                    const d = (((degree - 1 - dir * s) % degreeCount) + degreeCount) % degreeCount + 1;
                                    if (!push(d)) return null;
                                }
                                if (landOnPivot && !push(degree)) return null;
                                if (!evs.length) return null;

                                const shareTxt = `shares ${shared}/${total} note${shared === 1 ? '' : 's'} with ${target.fullName}`;
                                // Symmetric collections have several equally
                                // true names — this one set is also B/D#/F#
                                // octatonic — so name the alternatives rather
                                // than making one arbitrary rooting look like
                                // the only way in.
                                const alts = (cand.altRoots || [])
                                    .filter(a => a.scaleId === scaleId)
                                    .map(a => a.scaleRoot)
                                    .slice(0, 3);
                                evs[0].explain =
                                    `${names.join(' → ')} — from ${scaleRoot} ${this.prettyScale(scaleId)} ` +
                                    `(degree ${degree} of ${degreeCount} is ${cand.pivotChord.fullName || this.fullName(cand.pivotChord.root, cand.pivotChord.chordType)}, ` +
                                    `${shareTxt})` +
                                    (alts.length ? ` — same notes as ${alts.join('/')} ${this.prettyScale(scaleId)}` : '');
                                return evs;
                            }
                        });
                    }
                }
            }
        }

        // --- chains (formula-built secondary dominants) ---
        if (!diatonicOnly && maxBeats >= 1) {
            const v = this.transpose(t, 7);
            const vOfV = this.transpose(t, 2);
            plans.push({
                id: 'chain:V/V-V7', family: 'chain', spice: 0.45, beats: 1,
                build: () => [
                    this.makeEvent(vOfV, '7', `V7/V/${tRoman}`, 0.5, vOfV, 'mixolydian', 'dominant-chain',
                        `${vOfV}7 → ${v}7 — circle-of-fifths chain into ${target.fullName}`),
                    this.makeEvent(v, '7', `V7/${tRoman}`, 0.5, v, 'mixolydian', 'dominant-chain', null)
                ]
            });
            plans.push({
                id: 'chain:iiø-V7b9', family: 'chain', spice: 0.58, beats: 1,
                build: () => [
                    this.makeEvent(this.transpose(t, 2), 'm7b5', `iiø/${tRoman}`, 0.5, this.transpose(t, 2), 'locrian', 'minor-cadence-chain',
                        `${this.transpose(t, 2)}m7b5 → ${v}7b9 — minor ii–V into ${target.fullName}`),
                    this.makeEvent(v, '7b9', `V7b9/${tRoman}`, 0.5, v, 'octatonic', 'minor-cadence-chain', null)
                ]
            });
        }

        const filtered = plans.filter(p => p.beats <= maxBeats + 1e-6);
        this._catalogCache[key] = filtered;
        this.lastCatalogSize = filtered.length;
        return filtered;
    }

    _qualityCompatible(a, b) {
        const norm = (q) => {
            const s = String(q || '');
            if (/m7b5|ø/.test(s)) return 'm7b5';
            if (/dim/.test(s)) return 'dim';
            if (/maj7|maj9|maj13|^maj$|^6$/.test(s)) return 'maj';
            if (/^m/.test(s)) return 'min';
            if (/7|9|13/.test(s)) return 'dom';
            return 'maj';
        };
        return norm(a) === norm(b);
    }

    /**
     * Pick one approach plan into `target`.
     * @param {Object} opts {target, tone, tension, energy, rng, maxBeats, colorLevel}
     * @returns {Object|null} {strategy, family, steal, events} or null
     */
    plan(opts = {}) {
        const target = opts.target;
        if (!target || !target.root) return null;
        const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
        const tone = String(opts.tone || 'balanced').toLowerCase();
        const tension = Math.max(0, Math.min(1, Number(opts.tension) || 0));
        const colorLevel = Number.isFinite(opts.colorLevel)
            ? Math.max(0, Math.min(1, opts.colorLevel))
            : Math.max(0.2, Math.min(0.8, 0.3 + tension * 0.4));
        const maxBeats = Number.isFinite(opts.maxBeats) ? opts.maxBeats : 1;
        if (maxBeats < 0.5) return null;

        const catalog = this.buildCatalog(target, { maxBeats, diatonicOnly: !!opts.diatonicOnly });
        if (!catalog.length) return null;

        const darkTone = /dark|angry|intense|mysterious|sad/.test(tone);
        const brightTone = /joyful|hopeful|playful|dreamy|calm|peaceful|balanced/.test(tone);

        // Weight: spice proximity to the requested color level, then tone bias.
        const weights = catalog.map(p => {
            let w = 1 / (0.12 + Math.abs(p.spice - colorLevel));
            if (darkTone && (p.family === 'planing' || /subV7|7b9|iiø/.test(p.id))) w *= 1.35;
            if (brightTone && (p.family === 'pivot' || /^dom:V7/.test(p.id))) w *= 1.25;
            return w;
        });
        const totalW = weights.reduce((s, w) => s + w, 0);
        let pick = rng() * totalW;
        let chosen = catalog[0];
        for (let i = 0; i < catalog.length; i++) {
            pick -= weights[i];
            if (pick <= 0) { chosen = catalog[i]; break; }
        }

        const events = chosen.build();
        if (!events || !events.length) return null;
        const steal = events.reduce((s, e) => s + e.duration, 0);
        if (steal > maxBeats + 1e-6) return null;
        return { strategy: chosen.id, family: chosen.family, spice: chosen.spice, steal, events };
    }
}

if (typeof window !== 'undefined') {
    window.ApproachEngine = ApproachEngine;
    // Console helper for exploring what's available for a chord, e.g.:
    //   __approachCatalog('C', 'maj7')
    window.__approachCatalog = function (root, chordType, maxBeats) {
        const mt = window.modularApp && window.modularApp.musicTheory;
        const ae = new ApproachEngine(mt);
        const cat = ae.buildCatalog(
            { root, chordType: chordType || 'maj7', fullName: `${root}${chordType || 'maj7'}` },
            { maxBeats: Number.isFinite(maxBeats) ? maxBeats : 1.5 });
        console.table(cat.map(p => ({ id: p.id, family: p.family, spice: p.spice, beats: p.beats })));
        return cat;
    };
}
