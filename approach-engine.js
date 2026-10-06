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
     * WHAT THIS COLLECTION IS CALLED WHEN THE TARGET IS ITS ROOT.
     *
     * A scale rooted a fifth above the target stands where a dominant stands,
     * which is the procedure. This is the REASON it resolves: re-rooted on the
     * target, the same seven notes are very often an ordinary scale on that
     * target — so the approach material and the arrival are one collection
     * heard from two tonics, and the resolution is a change of centre rather
     * than a change of notes. When the re-rooted reading has a name a player
     * knows, that is the strongest possible argument for the choice, and it is
     * worth preferring over a collection that merely shares a lot of notes.
     *
     * @returns {string|null} the id naming this set rooted on `targetPc`
     */
    parentNameOnTarget(notes, targetPc) {
        if (!Number.isFinite(targetPc) || targetPc < 0) return null;
        let mask = 0;
        (notes || []).forEach((n) => {
            const pc = this.pitchValue(n);
            if (Number.isFinite(pc) && pc >= 0) mask |= 1 << pc;
        });
        if (!mask) return null;
        const rot = ApproachEngine.rotateMask(mask, (12 - (targetPc % 12)) % 12);

        if (!this._maskToId) {
            const map = new Map();
            for (const entry of this.scaleMaskIndex()) {
                const prev = map.get(entry.mask0);
                if (!prev || entry.rank < prev.rank) map.set(entry.mask0, entry);
            }
            this._maskToId = map;
        }
        const hit = this._maskToId.get(rot);
        return hit ? hit.scaleId : null;
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
     * EVERY SCALE IN THE LIBRARY THAT COULD BE ROOTED HERE.
     *
     * The shared-root search above asks "which collections contain a chord on
     * the target's root". This asks the blunter question the approach-scales
     * mode needs: give me the scales rooted on THIS note, most familiar first
     * but not only the familiar ones — the whole point of the mode is that the
     * approach material comes from the 1300+ library rather than from the nine
     * hand-listed modes the pivot family uses.
     *
     * Deduped by pitch-class SET, because one collection wears many names and
     * a list of twelve rows describing the same seven notes is a list of one.
     * The ordering is stratified rather than sorted: taking the top `limit` by
     * familiarity returns major, dorian, mixolydian… every time, which is the
     * opposite of what a mode built on an enormous scale library is for. So
     * the head of the ranking is kept and the tail is sampled across, which
     * puts the ordinary collections and the strange ones in the same result.
     *
     * @param {string} rootNote      the note the scales are rooted on
     * @param {Array}  sizes         permitted note counts (7 is diatonic-shaped, 8 the diminished/octatonic family)
     * @param {number} limit         how many collections to return
     * @param {number} mustContainPc a pitch class the collection has to hold, or null
     */
    scalesRootedAt(rootNote, { sizes = [7], limit = 12, mustContainPc = null } = {}) {
        const rootPc = this.pitchValue(rootNote);
        if (!Number.isFinite(rootPc) || rootPc < 0) return [];
        const cacheKey = `${rootPc}|${sizes.join(',')}|${limit}|${mustContainPc}`;
        this._rootedCache = this._rootedCache || {};
        if (this._rootedCache[cacheKey]) return this._rootedCache[cacheKey];

        const bySet = new Map();
        for (const entry of this.scaleMaskIndex()) {      // already ordered by familiarity
            if (!sizes.includes(entry.size)) continue;
            const mask = ApproachEngine.rotateMask(entry.mask0, rootPc);
            if (mustContainPc !== null && !(mask & (1 << mustContainPc))) continue;
            if (bySet.has(mask)) continue;
            bySet.set(mask, entry);
        }
        const all = Array.from(bySet.values());
        const head = Math.min(4, limit, all.length);
        const picked = all.slice(0, head);
        if (all.length > head && picked.length < limit) {
            const want = limit - picked.length;
            const stride = Math.max(1, Math.floor((all.length - head) / want));
            for (let i = head; i < all.length && picked.length < limit; i += stride) picked.push(all[i]);
        }

        const out = [];
        picked.forEach((entry) => {
            const notes = this.scaleNotes(rootNote, entry.scaleId);
            if (!notes || notes.length !== entry.size) return;
            out.push({ scaleId: entry.scaleId, size: entry.size, notes, rank: entry.rank });
        });
        this._rootedCache[cacheKey] = out;
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
    /**
     * THE APPROACH-SCALES MODE.
     *
     * Both families here answer the same brief and differ only in where the
     * borrowed collection is rooted. The base scale and the progression stay
     * plain; ALL of the outside colour lives in the approach, which is what
     * makes the mode teachable — there is exactly one thing happening.
     *
     *   fifthAbove      the default. Approaching Bm7, draw from the F♯ scale
     *                   family: F♯7 is the tonic chord of an F♯ collection and
     *                   A♯m7♭5 is that same collection's chord a step below
     *                   the target. A fifth above the target is where a
     *                   dominant lives, so the collection rooted there already
     *                   points at the chord; which of the 1300+ F♯ scales it
     *                   is decides what the pointing sounds like.
     *
     *   parallelTarget  the advanced toggle. Draw from a scale rooted on the
     *                   TARGET'S OWN root — and never sound that scale's tonic
     *                   chord. Approaching Cmaj7 through C diminished gives
     *                   Ddim7 → Cmaj7 or E♭dim7 → Ddim7 → Cmaj7: the C-ness is
     *                   saved for the arrival, so the borrowed collection is
     *                   heard as tension pointing at a C that has not happened
     *                   yet rather than as a different kind of C.
     *
     * A collection is only usable if the chords taken from it are chords a
     * player would read — stacking thirds on the remoter scales produces
     * things like Asus2(add11,♭13,#5), which is a true description of some
     * pitches and not a chord symbol.
     */
    approachScaleFamilies(target, maxBeats, advanced, homeScaleNotes, opts = {}) {
        const plans = [];
        // WHERE THE COLLECTION IS ROOTED, AND HOW WIDE THE LIBRARY OPENS.
        //
        // `advanced` was a boolean meaning "also draw from the target's own
        // root", so the own-root family could only ever be an ADDITION to the
        // fifth-above one and never a choice. They are two co-equal devices —
        // a fifth above for major targets, the target's own root for minor —
        // and asking for the second alone is a thing a player does. `source`
        // says which, and `advanced` is kept as its derived shorthand so
        // existing callers keep working.
        //
        //   fifth   a collection rooted a fifth above the target
        //   root    a collection rooted on the target's own root
        //   both    offer both families and let the piece choose
        //
        // `palette` says how much of the library is in play:
        //
        //   lands   the ones that land — mixolydian above, bebop on the root —
        //           pinned to the front, everything else still behind them
        //   sevens  seven-note collections only, the older behaviour
        //   all     the whole library, nothing pinned
        const source = opts.source || (advanced ? 'both' : 'fifth');
        const palette = opts.palette || 'lands';
        const wantFifth = source === 'fifth' || source === 'both';
        const wantRoot = source === 'root' || source === 'both';
        const sizes = palette === 'sevens' ? [7] : [7, 8];
        const poolLimit = palette === 'all' ? 60 : 40;
        // Move `scaleId` to the front, adding it if the ranking cut it. A
        // pinned collection is a DEFAULT, not a restriction: it leads the list
        // and the rest of the library follows it, so the common answer is one
        // click away and the other thousand-odd are still reachable.
        const pinFirst = (list, scaleId, rootNote, decorate) => {
            if (palette !== 'lands' || !scaleId) return list;
            const at = list.findIndex(c => c.scaleId === scaleId);
            if (at > 0) { const [hit] = list.splice(at, 1); list.unshift(hit); return list; }
            if (at === 0) return list;
            const notes = this.scaleNotes(rootNote, scaleId);
            if (!notes || !notes.length) return list;
            list.unshift(decorate({ scaleId, size: notes.length, notes, rank: 0 }));
            return list;
        };
        if (!this.mt || typeof this.mt.getDiatonicChord !== 'function') return plans;
        const t = target.root;
        const tq = String(target.chordType || 'maj7');
        const minorTarget = /^m(?!aj)/.test(tq);
        // A dominant seventh reads as "not minor" to the test above and is not
        // a major chord either: its seventh is flat, so the collection that
        // lands on it is a different mode from the one that lands on maj7.
        const dominantTarget = /^(7|9|11|13)/.test(tq);
        const tRoman = target.roman || target.fullName || this.fullName(t, tq);
        const tPc = this.pitchValue(t);
        if (!Number.isFinite(tPc) || tPc < 0) return plans;

        const targetTones = (Array.isArray(target.chordNotes) && target.chordNotes.length)
            ? target.chordNotes : this.chordNotes(t, tq);
        const targetPcs = new Set(targetTones.map(n => this.pitchValue(n)).filter(p => Number.isFinite(p) && p >= 0));
        const overlapOf = (notes) => {
            let n = 0;
            notes.forEach(x => { if (targetPcs.has(this.pitchValue(x))) n++; });
            return n / Math.max(1, targetPcs.size);
        };

        // THE COLLECTION THE PIECE IS ALREADY IN IS NOT A BORROW.
        //
        // Nothing stopped the target's-own-root family from choosing the HOME
        // scale: approaching Dmaj7 in D major, "D Major" is a scale rooted on
        // the target's root, so it qualified — and the panel then listed
        // Bm7 → C#m7b5 under "chords borrowed from outside the key" when both
        // are vi and vii° of the key the piece has been in throughout. The
        // approach may still be a good one; it is simply not a borrow, and
        // saying it is, is the kind of explanation this generator has twice
        // been caught using to defend output. Identical pitch-class SET, not
        // identical name — one collection has many names.
        const homeMask = (() => {
            let m = 0;
            (homeScaleNotes || []).forEach(n => {
                const pc = this.pitchValue(n);
                if (Number.isFinite(pc) && pc >= 0) m |= 1 << pc;
            });
            return m;
        })();
        const isHomeCollection = (notes) => {
            if (!homeMask) return false;
            let m = 0;
            notes.forEach(n => {
                const pc = this.pitchValue(n);
                if (Number.isFinite(pc) && pc >= 0) m |= 1 << pc;
            });
            return m === homeMask;
        };

        // A ROOT SPELLED THE WAY ITS CONTEXT SPELLS IT. `transpose` walks a
        // sharp table, so a fifth above E♭ came back as A♯ — the right pitch,
        // an unreadable name, and a source scale printed as "A♯ Major
        // (A♯ C D D♯ F G A)" in a piece written in flats.
        const spellLike = (pc, reference) => {
            const wantFlat = /b/.test(String(reference || '').slice(1))
                || (homeScaleNotes || []).some(n => /b/.test(String(n).slice(1)));
            if (this.mt && typeof this.mt.spellSemitoneWithPreference === 'function') {
                try {
                    const spelled = this.mt.spellSemitoneWithPreference(pc, wantFlat, null);
                    if (spelled) return spelled;
                } catch (_) {}
            }
            const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            return wantFlat ? flats[((pc % 12) + 12) % 12] : this.chromatic[((pc % 12) + 12) % 12];
        };

        const mkChord = (scaleRoot, scaleId, degree, notes) => {
            const c = this.scaleDegreeChord(scaleRoot, scaleId, degree, notes);
            if (!c || !this.isPlainQuality(c.chordType)) return null;
            const tones = c.chordNotes || c.diatonicNotes || [];
            if (tones.length < 3) return null;
            if (tones.some(x => /##|bb/.test(String(x)))) return null;
            // Playing the target chord as its own approach is not an approach.
            if (this.sameChordNotes(tones, targetTones)) return null;
            return c;
        };
        const eventFor = (c, scaleRoot, scaleId, notes, reason, degree) => ({
            ...c,
            duration: 0.5,
            roman: `${degree}/${scaleRoot} ${scaleId}`,
            scaleHint: { root: scaleRoot, scaleName: scaleId, scaleNotes: notes, reason },
            explain: null
        });

        // --- a fifth above the target -----------------------------------
        const fifth = spellLike((tPc + 7) % 12, t);
        // SELECT ON THE CHORD, NOT JUST ON ITS ROOT.
        //
        // `mustContainPc` asks only that the collection hold the target's
        // ROOT, and the chord-tone overlap below was computed and then spent
        // entirely on pricing spice — nothing ranked by it. So a collection
        // holding one note of the chord it was approaching could be offered
        // ahead of one holding three, which is the opposite of what makes an
        // approach land.
        //
        // ORDERING, IN PRIORITY: how much of the target CHORD the collection
        // already contains; then whether the collection re-rooted on the
        // target is a scale with a NAME, and how ordinary that name is; then
        // familiarity.
        //
        // THE NAME IS THE TIEBREAK, NOT THE CRITERION, and the difference
        // matters. Approaching E from a fifth above, B major and B mixolydian
        // hold the SAME amount of an E chord — all of it — so overlap alone
        // cannot separate them, and it is the name on the target that does:
        // rooted on E those two collections are E lydian and E major, and the
        // ordinary one is the one that lands. That is a tie being broken.
        // Promote the name above overlap and it stops being a tiebreak and
        // starts overruling the chord: approaching Fm7, the collection whose
        // name on F is plain F MAJOR sorts to the front holding two notes of
        // four, ahead of the one holding all four, and the approach argues
        // with the quality of the chord it is approaching.
        //
        // Sizes [7, 8], matching the target's-own-root family below. Of the
        // library's collections roughly a fifth have eight notes, and the
        // ones that matter here are real approach material: a scale whose
        // alternate degrees give a diminished seventh and a sixth chord is
        // exactly what a half-step-below approach is made of. Excluding them
        // was never argued for — the seven-note filter was written against
        // collections SMALLER than seven, which cannot harmonise.
        const decorateFifth = (c) => {
            const parent = this.parentNameOnTarget(c.notes, tPc);
            const parentRank = parent
                ? ((typeof ScaleColour !== 'undefined')
                    ? ScaleColour.familiarityOf(parent, {}) : 0)
                : 9999;
            return { ...c, chordOverlap: overlapOf(c.notes), parent, parentRank };
        };
        const fifthScales = !wantFifth ? [] : pinFirst(
            this.scalesRootedAt(fifth, { sizes, limit: poolLimit, mustContainPc: tPc })
                .filter(c => !isHomeCollection(c.notes))
                .map(decorateFifth)
                .sort((a, b) =>
                    (b.chordOverlap - a.chordOverlap)
                    || (a.parentRank - b.parentRank)
                    || (a.rank - b.rank))
                .slice(0, 16),
            // Mixolydian is the one that lands here, and the reason is the one
            // parentNameOnTarget already knows: rooted on the target these are
            // the target's own major scale, so approach and arrival are one
            // collection heard from two centres.
            //
            // WHICH MODE LANDS DEPENDS ON THE QUALITY OF THE CHORD, and there
            // are three answers, not two.
            //
            // The rule underneath all of them is one thing: pin the collection
            // a fifth above whose notes RE-ROOTED ON THE TARGET are the
            // target's own parent scale, so approach and arrival are one
            // collection heard from two centres. Which mode that is depends on
            // what the target's parent scale is.
            //
            //   maj7 target → its parent is its own major scale, and a fifth
            //     above that is MIXOLYDIAN. Holds all four notes of the chord.
            //   7 target → a dominant seventh's parent is the major scale a
            //     fourth below it, so on the target that is MIXOLYDIAN, and a
            //     fifth above THAT is DORIAN. Approaching A7, E dorian is
            //     D major — it holds A, C#, E and G, all four.
            //   m7 target → not this family's to answer. It is the bebop
            //     collection on the target's own root, pinned below.
            //
            // The dominant case was being handed mixolydian, and that is the
            // very error the minor case exists to prevent. Against A7, E
            // mixolydian carries G# where the chord has G natural: three of
            // four, pinned in front of collections holding all four. A
            // preference must never outrank the chord it is approaching, and
            // "major or not" is too coarse a question to keep that promise —
            // a dominant seventh is not a major chord.
            minorTarget ? null : (dominantTarget ? 'dorian' : 'mixolydian'),
            fifth, decorateFifth);
        for (const cand of fifthScales) {
            const { scaleId, size, notes } = cand;
            const rootPc = this.pitchValue(fifth);
            // Where the target sits inside this collection, so its neighbours
            // are the chords that step into it.
            let targetDegree = -1;
            for (let d = 1; d <= size; d++) {
                const pc = this.pitchValue(notes[d - 1]);
                if (pc === tPc) { targetDegree = d; break; }
            }
            if (targetDegree < 0) continue;

            const tonicChord = mkChord(fifth, scaleId, 1, notes);
            const below = mkChord(fifth, scaleId, ((targetDegree - 2 + size) % size) + 1, notes);
            const above = mkChord(fifth, scaleId, (targetDegree % size) + 1, notes);
            const spice = Math.min(0.95, Math.max(0.2,
                0.34 + (1 - overlapOf(notes)) * 0.4 + (cand.rank > 1 ? 0.16 : 0)));
            const src = `${fifth} ${this.prettyScale(scaleId)}`;
            // SAY WHAT IS A FIFTH ABOVE WHAT. Written as "B7 — degree 5 of E
            // Major, a fifth above A7" the clause reads as a claim about B7,
            // which is a second above A, and the whole sentence then looks like
            // the engine cannot count intervals. The thing a fifth above the
            // target is the SCALE'S ROOT, and it has to be named in the same
            // breath or the sentence is not describing what happened.
            const why = `whose root ${fifth} is a fifth above ${target.root}`;
            // The sharper reason, when it holds: these same notes rooted on the
            // target are an ordinary scale there, so the approach and the
            // arrival are one collection heard from two centres.
            const parentWhy = cand.parent
                ? ` The same seven notes rooted on ${target.root} are ${target.root} `
                  + `${this.prettyScale(cand.parent)} — approach and arrival are one collection `
                  + `heard from two centres, which is why it lands rather than merely fits.`
                : '';
            const held = Math.round((cand.chordOverlap || 0) * (targetPcs.size || 1));
            const overlapWhy = held > 0
                ? ` It already holds ${held} of ${targetPcs.size} notes of ${target.fullName}.`
                : '';

            // WALK CONSECUTIVE DEGREES INTO THE TARGET — AND NEVER OPEN ON
            // THE COLLECTION'S OWN TONIC CHORD.
            //
            // This family used to offer three things: the borrowed collection's
            // tonic chord alone; the chord one step from the target; and the
            // two together. The first and third are the reason a borrowed
            // approach could arrive sounding like a change of key.
            //
            // The collection here is rooted A FIFTH ABOVE the target, so its
            // tonic chord is a rival centre. Sounding it first states that
            // centre, and the chord that follows is then heard as belonging to
            // it rather than as pointing at the target. In D major, approaching
            // A7 out of E major, the pair came out `Emaj7 → B7` — degree 1 then
            // degree 5, which is I–V of E. The approach tonicized E and then
            // reached A7 from inside the key it had just invented, which is a
            // borrowing borrowed from a borrowing. Measured before this change,
            // 57% of every fifth-above approach opened on the collection's
            // tonic; worse, `Amaj7 → E7 → Dmaj7` tonicized the dominant in
            // order to arrive home.
            //
            // THE RULE THAT REPLACES IT is the one the target's-own-root family
            // already uses: a walk is a run of CONSECUTIVE degrees ending on a
            // degree adjacent to the target. Consecutive degrees cannot spell a
            // cadence, so no rival centre is asserted — the collection is heard
            // as a scale being walked rather than as a key being visited.
            //
            // Degree 1 is not forbidden outright, only as an OPENING. A walk
            // that passes through it on the way in is a passing chord like any
            // other; it is the first chord of a gesture that says where the
            // music is. This is deliberately narrower than the blanket
            // withholding that was removed for the own-root family, because
            // there the collection is rooted ON the target and its tonic chord
            // is the target's own centre, not a rival one — which is exactly
            // what makes the sixth-diminished alternation work and must stay.
            const chordAtDeg = [];
            for (let d = 1; d <= size; d++) chordAtDeg[d] = mkChord(fifth, scaleId, d, notes);
            const degWrap = (d) => ((d - 1 + size * 4) % size) + 1;

            [['up', -1, degWrap(targetDegree - 1)],
             ['down', 1, degWrap(targetDegree + 1)]].forEach(([dir, step, landing]) => {
                for (let len = 1; len <= 4; len++) {
                    const beats = len * 0.5;
                    if (beats > maxBeats + 1e-6) break;
                    const degs = [];
                    for (let i = len - 1; i >= 0; i--) degs.push(degWrap(landing + step * i));
                    // The opening chord is what states a centre, so that is the
                    // one position degree 1 may not take.
                    if (degs[0] === 1) continue;
                    const chords = degs.map(d => chordAtDeg[d]);
                    if (chords.some(c => !c)) continue;
                    // Consecutive degrees can still spell the same chord twice
                    // running in a symmetric collection; a repeat is not a step.
                    let repeats = false;
                    for (let i = 1; i < chords.length; i++) {
                        if (this.sameChordNotes(chords[i].chordNotes || [], chords[i - 1].chordNotes || [])) {
                            repeats = true; break;
                        }
                    }
                    if (repeats) continue;
                    plans.push({
                        id: `fifth:${scaleId}@${fifth}:${dir}${landing}x${len}`, family: 'fifthAbove',
                        spice: Math.min(1, spice + (len - 1) * 0.05), beats,
                        build: () => {
                            const evs = chords.map((c, i) =>
                                eventFor(c, fifth, scaleId, notes, 'fifth-above-scale', degs[i]));
                            const names = chords.map(c => c.fullName).join(' → ');
                            const where = len === 1
                                ? `Inside that scale ${chords[0].root} sits one step `
                                  + `${dir === 'up' ? 'below' : 'above'} ${target.root}, so it steps into `
                                  + `${target.fullName}.`
                                : `Degrees ${degs.join(', ')} of that scale, consecutive, walking `
                                  + `${dir === 'up' ? 'up' : 'down'} into ${target.fullName} — a scale `
                                  + `being walked rather than a key being visited.`;
                            evs[0].explain = `${names} — from ${src}, the scale ${why}. ${where}`
                                + overlapWhy + parentWhy;
                            for (let i = 1; i < evs.length; i++) {
                                evs[i].explain = `${chords[i].fullName} — degree ${degs[i]} of ${src}, `
                                    + `the scale ${why}, on the way into ${target.fullName}.`;
                            }
                            return evs;
                        }
                    });
                }
            });
        }

        // --- the target's own root, tonic chord withheld -------------------
        if (wantRoot) {
            // RANKED, NOT SAMPLED. This family asked for fourteen collections
            // and took whatever `scalesRootedAt` handed back — and that method
            // does not return the top fourteen, it takes four from the head
            // and then STRIDES across the rest of the library to fill the
            // quota. So which collections a chord got approached from was an
            // artifact of the stride, and the family alone among the families
            // here had no ordering of its own.
            //
            // Ask for a wide pool, then rank it the way the fifth-above family
            // is ranked, and cut to the same fourteen. Overlap leads here
            // rather than the parent name: this collection is ALREADY rooted
            // on the target, so re-rooting it on the target is a no-op and
            // parentNameOnTarget would return its own name for every
            // candidate — no discrimination at all. What separates them is how
            // much of the chord being approached they actually hold.
            const decorateRoot = (c) => ({ ...c, chordOverlap: overlapOf(c.notes) });
            // THE ONE THAT LANDS ON A MINOR CHORD IS THE BEBOP COLLECTION, and
            // ranking on overlap alone will not find it. Against a m7 target
            // `bebop_minor` holds three of four chord tones — it carries the
            // natural seventh, not the ♭7 — so every ordinary seven-note
            // collection holding all four outranks it and it falls outside the
            // cut. That is the ranking working correctly and still missing the
            // device, because what makes this collection the right one is not
            // how much of the chord it holds: it is that its alternate degrees
            // ARE a diminished seventh and a sixth chord, so the degree a step
            // below the target is the dim7 a half step under it. Pin it, and
            // let overlap order everything behind it.
            const bebop = minorTarget ? 'bebop_minor' : 'bebop_major';
            const parScales = pinFirst(
                this.scalesRootedAt(t, { sizes, limit: poolLimit })
                    .filter(c => !isHomeCollection(c.notes))
                    .map(decorateRoot)
                    .sort((a, b) =>
                        (b.chordOverlap - a.chordOverlap)
                        || (a.rank - b.rank))
                    .slice(0, 14),
                bebop, t, decorateRoot);
            for (const cand of parScales) {
                const { scaleId, size, notes } = cand;
                // WALK THE COLLECTION'S OWN CHORDS INTO THE TARGET.
                //
                // This family used to offer exactly two chords out of a whole
                // collection — the degree a step above the target and the one a
                // step below — and refused degree 1 outright. Both restrictions
                // came from one rule: the arrival must be the first time the
                // target chord is heard. That rule is right. It was simply
                // enforced in the wrong place, and far too widely.
                //
                // THE INVARIANT IS ALREADY GUARANTEED, at every degree, by
                // mkChord: it refuses any degree whose chord has the target's
                // own notes, so the target cannot be sounded early even in a
                // symmetric collection where the same chord recurs at several
                // degrees — which is the case the old comment worried about and
                // could not actually cover by refusing a degree NUMBER.
                //
                // What withholding degree 1 additionally forbade was the
                // collection's tonic chord even when it is a DIFFERENT chord
                // from the target. Approaching Em7 out of E bebop minor, degree
                // 1 is Em6 — not the target, a genuine approach chord, and half
                // of the alternation that makes that collection worth borrowing
                // at all. The rule was throwing away the best chord in the
                // scale to protect an arrival that mkChord was already
                // protecting.
                //
                // So: every degree that yields a plain stacked-thirds chord is
                // walkable, and a walk is a run of CONSECUTIVE degrees, taken
                // modulo the collection's size so it may pass through degree 1,
                // ending on a degree adjacent to the target root. Symmetric and
                // eight-note collections fall out of this rather than needing a
                // case: in a sixth-diminished collection consecutive degrees
                // alternate a diminished seventh with a sixth chord, so the
                // walk IS the alternation, and in any other collection it is an
                // ordinary stepwise approach.
                const chordAt = [];
                for (let d = 1; d <= size; d++) chordAt[d] = mkChord(t, scaleId, d, notes);
                const spice = Math.min(0.98, Math.max(0.3,
                    0.45 + (1 - overlapOf(notes)) * 0.4 + (cand.rank > 1 ? 0.14 : 0)));
                const src = `${t} ${this.prettyScale(scaleId)}`;
                const degName = (d) => ((d - 1 + size) % size) + 1;

                // LENGTH IS A WINDOW, NOT A CONSTANT. Too brief and the borrowed
                // collection goes by before it can be heard as a colour at all;
                // too long and it stops decorating the key and starts replacing
                // it. One to four chords, and the shorter ones are priced lower
                // so they stay the common case.
                // WHERE A WALK IS ALLOWED TO END. A step below the target root
                // is the last degree, a step above it is degree 2 — and degree
                // 1 is the third way in, the collection's own tonic chord
                // resolving into the target.
                //
                // That third landing is self-limiting, which is why it can be
                // offered unconditionally. In an ordinary collection rooted on
                // the target, degree 1 IS the target chord, so mkChord returns
                // null for it and the landing simply never fires. It only opens
                // where the collection's tonic chord genuinely differs from the
                // chord being approached — E bebop minor giving Em6 into Em7,
                // a sixth resolving to a seventh, which is the pair the whole
                // sixth-diminished sound is built out of.
                [['up', -1, size], ['up', -1, 1], ['down', 1, 2]].forEach(([dir, step, landing]) => {
                    for (let len = 1; len <= 4; len++) {
                        const beats = len * 0.5;
                        if (beats > maxBeats + 1e-6) break;
                        const degs = [];
                        for (let i = len - 1; i >= 0; i--) degs.push(degName(landing + step * i));
                        const chords = degs.map(d => chordAt[d]);
                        if (chords.some(c => !c)) continue;
                        // Consecutive degrees can still spell the same chord
                        // twice running in a symmetric collection; a repeat is
                        // not a step.
                        let repeats = false;
                        for (let i = 1; i < chords.length; i++) {
                            if (this.sameChordNotes(chords[i].chordNotes || [], chords[i - 1].chordNotes || [])) {
                                repeats = true; break;
                            }
                        }
                        if (repeats) continue;
                        plans.push({
                            id: `par:${scaleId}@${t}:${dir}${landing}x${len}`, family: 'parallelTarget',
                            spice: Math.min(1, spice + (len - 1) * 0.05), beats,
                            build: () => {
                                const evs = chords.map((c, i) =>
                                    eventFor(c, t, scaleId, notes, 'parallel-target-scale', degs[i]));
                                const names = chords.map(c => c.fullName).join(' → ');
                                // EVERY CHORD NAMES ITS OWN SOURCE, not just the
                                // first of the walk. A four-chord walk is two
                                // beats and can cross a bar line, and anything
                                // reading these per bar then met a borrowed
                                // chord carrying no attribution at all — the one
                                // thing this mode is not allowed to ship.
                                evs.forEach((ev, i) => {
                                    ev.explain = i === 0
                                        ? `${names} → ${target.fullName} — degree`
                                          + `${degs.length > 1 ? 's' : ''} ${degs.join(', ')} of ${src}, a `
                                          + `scale rooted on the target's OWN root, walking ${dir} into it. `
                                          + `The target chord itself is never sounded before the arrival.`
                                        : `${chords[i].fullName} — degree ${degs[i]} of ${src}, continuing `
                                          + `the walk ${dir} into ${target.fullName}.`;
                                });
                                return evs;
                            }
                        });
                    }
                });
            }
        }

        // PINNING THE COLLECTION IS NOT ENOUGH TO BE HEARD. Ordering the
        // candidate list puts the collection that lands at the front, but what
        // finally gets played is drawn by weight from the whole catalog, and
        // each collection contributes a different NUMBER of plans — the bebop
        // collection yields two where an ordinary seven-note one yields four.
        // Front of the list, half the tickets: pinning changed the order of
        // something nothing downstream reads in order. Mark the plans instead,
        // and let `plan()` weight them. Still a default and not a restriction —
        // every other collection keeps its tickets.
        if (palette === 'lands') {
            const heads = new Set();
            if (wantFifth && !minorTarget) heads.add('fifth:mixolydian');
            if (wantRoot) heads.add(`par:${minorTarget ? 'bebop_minor' : 'bebop_major'}`);
            plans.forEach((p) => {
                if (heads.has(String(p.id).split('@')[0])) p.preferred = true;
            });
        }
        return plans.filter(p => p.beats <= maxBeats + 1e-6);
    }

    buildCatalog(target, { maxBeats = 1.5, diatonicOnly = false, mode = null, advanced = false,
                          homeScaleNotes = null, source = null, palette = null } = {}) {
        // Both new keys go in the cache key. A catalog built for "the ones that
        // land, rooted on the target" is a different catalog from one built for
        // "the whole library, a fifth above", and keying only on `advanced`
        // would serve the first answer to the second question.
        const key = `${target.root}|${target.chordType || 'maj7'}|${maxBeats}|${diatonicOnly ? 'dia' : 'all'}`
            + `|${mode || 'default'}|${advanced ? 'adv' : 'std'}|${source || 'auto'}|${palette || 'lands'}`
            + `|${(homeScaleNotes || []).join('')}`;
        if (this._catalogCache[key]) return this._catalogCache[key];

        // The mode REPLACES the catalog rather than adding to it. Mixing the
        // ordinary families back in would make the one thing the mode exists to
        // demonstrate the minority of what is heard.
        if (mode === 'approach-scales') {
            const only = this.approachScaleFamilies(target, maxBeats, advanced, homeScaleNotes,
                { source, palette });
            this._catalogCache[key] = only;
            this.lastCatalogSize = only.length;
            return only;
        }

        const plans = [];
        const t = target.root;
        const tq = String(target.chordType || 'maj7');
        const tRoman = target.roman || target.fullName || this.fullName(t, tq);
        const minorTarget = /^m(?!aj)/.test(tq);
        // A dominant seventh reads as "not minor" to the test above and is not
        // a major chord either: its seventh is flat, so the collection that
        // lands on it is a different mode from the one that lands on maj7.
        const dominantTarget = /^(7|9|11|13)/.test(tq);

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

        const catalog = this.buildCatalog(target, {
            maxBeats,
            diatonicOnly: !!opts.diatonicOnly,
            mode: opts.mode || null,
            advanced: !!opts.advanced,
            source: opts.source || null,
            palette: opts.palette || null,
            homeScaleNotes: opts.homeScaleNotes || null
        });
        if (!catalog.length) return null;

        const darkTone = /dark|angry|intense|mysterious|sad/.test(tone);
        const brightTone = /joyful|hopeful|playful|dreamy|calm|peaceful|balanced/.test(tone);

        // Weight: spice proximity to the requested color level, then tone bias.
        const weights = catalog.map(p => {
            let w = 1 / (0.12 + Math.abs(p.spice - colorLevel));
            if (darkTone && (p.family === 'planing' || /subV7|7b9|iiø/.test(p.id))) w *= 1.35;
            if (brightTone && (p.family === 'pivot' || /^dom:V7/.test(p.id))) w *= 1.25;
            // The collection the palette says lands. Three, not ten: enough
            // that it is what the ear usually meets, not so much that the rest
            // of the library stops being reachable.
            if (p.preferred) w *= 3;
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
