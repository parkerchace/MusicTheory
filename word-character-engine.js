/**
 * word-character-engine.js
 *
 * Turns a word into a MUSICAL CHARACTER, then into a rhythmic cell.
 *
 * Why this exists: the emotion lexicon only covers a few hundred words, and
 * everything outside it fell back to a hash-like heuristic whose output was
 * uncorrelated (often anti-correlated) with meaning — "calm" read as negative,
 * "scream" as positive, "run" as low-arousal. Every word therefore produced the
 * same narrow energy band and the same three note durations.
 *
 * Three independent signals are combined here:
 *   1. SEMANTIC FIELDS — curated sets for the dimensions that matter musically
 *      (motion, stillness, impact, rise/fall, tension, tenderness, size).
 *   2. PHONETICS — plosives give sharp attacks and short notes; sonorants and
 *      long vowels sustain. This is why "chase" and "drift" must not scan alike.
 *   3. PROSODY — syllable count and English stress placement decide which notes
 *      in a cell are long and which are short.
 *
 * Modifiers ("scary chase" vs "happy chase") shift the character of the word
 * they attach to, so the same noun can read urgent or bright.
 */

(function () {
    'use strict';

    // --- 1. Semantic fields -------------------------------------------------
    // Kept compact but high-value: these are the words that actually recur in
    // lyrics and poetry. Each entry pushes specific musical dimensions.
    const FIELDS = {
        motion: {
            words: ['chase','run','sprint','dash','race','flee','rush','hurry','fly','dart','scramble','gallop','hunt','pursue','escape','ride','drive','spin','whirl','tumble','bolt','charge','storm','sweep','scatter','march','stride','leap','jump','climb','swim','soar','glide','travel','journey','wander','roam','follow','catch','hurl','fling','launch'],
            motion: 0.9, attack: 0.6, arousal: 0.6
        },
        stillness: {
            words: ['calm','still','quiet','silence','silent','rest','sleep','slumber','drift','float','linger','dwell','hush','lull','wait','slow','peace','peaceful','pause','settle','soothe','dream','doze','hover','suspend','idle','serene','tranquil','motionless','frozen','anchor','stay','remain'],
            motion: 0.05, attack: 0.12, arousal: -0.55, sustain: 0.9
        },
        impact: {
            words: ['crash','shatter','smash','burst','strike','slam','break','explode','thunder','blast','snap','crack','punch','hit','kick','stomp','clash','collide','rupture','split','tear','rip','slice','stab','shot','bang','boom','pound','hammer','wreck','crush','destroy'],
            motion: 0.7, attack: 1.0, arousal: 0.8, weight: 0.85
        },
        rise: {
            words: ['rise','climb','soar','lift','ascend','grow','bloom','hope','dawn','awaken','wake','begin','open','emerge','sunrise','spring','elevate','surge','swell','flourish','triumph','victory','win','achieve','reach','aspire','believe','faith','promise'],
            motion: 0.5, contour: 1, valence: 0.5, arousal: 0.25
        },
        fall: {
            words: ['fall','sink','drop','descend','collapse','fade','wilt','dusk','sunset','decay','crumble','wither','drown','bury','lower','plunge','dive','slip','lose','loss','end','ending','goodbye','farewell','grave','ruin'],
            motion: 0.4, contour: -1, valence: -0.45, arousal: -0.1
        },
        bright: {
            words: ['sun','sunshine','light','gold','golden','shine','bright','glow','spark','sparkle','joy','joyful','smile','laugh','happy','glad','cheer','radiant','gleam','shimmer','dazzle','warm','summer','clear','crystal','silver','bloom','color','rainbow'],
            brightness: 0.9, valence: 0.65, arousal: 0.3
        },
        dark: {
            words: ['dark','darkness','night','shadow','shade','black','gloom','murk','void','dread','abyss','deep','grim','bleak','cold','winter','fog','mist','smoke','ash','grey','gray','dim','eclipse','midnight','shroud','veil'],
            brightness: 0.08, valence: -0.5, arousal: 0.05, weight: 0.6
        },
        tension: {
            words: ['fear','scary','scared','afraid','panic','dread','terror','terrify','anxious','nervous','haunt','haunted','creep','lurk','stalk','threat','danger','warning','alarm','tremble','shiver','shudder','frantic','desperate','urgent','chase','flee','hide','trap','escape','scream','shriek','wail','howl','rage','fury','angry','anger','war','fight','blood','knife','ghost','monster','nightmare'],
            tension: 0.9, arousal: 0.7, valence: -0.55, attack: 0.6
        },
        tender: {
            words: ['love','gentle','soft','warm','kind','tender','sweet','care','hold','embrace','caress','whisper','cradle','comfort','heal','safe','home','mother','baby','friend','trust','grace','mercy','forgive','kiss','touch','sigh','breath','velvet','silk'],
            tension: 0.08, valence: 0.6, arousal: -0.35, attack: 0.1, sustain: 0.75
        },
        sorrow: {
            words: ['sad','sorrow','grief','mourn','weep','cry','tears','tear','lonely','alone','empty','hollow','ache','pain','hurt','broken','regret','miss','yearn','long','longing','melancholy','despair','sigh','wound','scar','forgotten','abandon'],
            valence: -0.7, arousal: -0.3, sustain: 0.7, tension: 0.35
        },
        vast: {
            words: ['ocean','sea','sky','mountain','forest','woods','desert','horizon','universe','world','earth','river','valley','canyon','plain','field','endless','infinite','eternal','vast','wide','deep','tall','giant','cathedral','monument'],
            weight: 0.75, sustain: 0.8, arousal: -0.15
        },
        small: {
            words: ['tiny','small','little','drop','speck','crumb','seed','spark','thread','whisper','moment','glimpse','bead','pebble','feather','petal','flicker','wisp'],
            weight: 0.12, attack: 0.35, brightness: 0.6
        }
    };

    // Modifiers reshape the word that follows (or the phrase overall).
    const INTENSIFIERS = ['very','so','too','really','extremely','utterly','deeply','wildly','madly','fiercely'];
    const DIMINISHERS = ['slightly','barely','faintly','softly','gently','almost','somewhat','a','little'];
    const NEGATORS = ['not','no','never','without','none','nothing'];

    // --- 2. Phonetics -------------------------------------------------------
    const PLOSIVES = 'ptkbdg';
    const SIBILANTS = 'szxj';
    const SONORANTS = 'lrmnwy';
    const LONG_VOWEL_PATTERNS = [/ee/, /oo/, /ea/, /ai/, /ay/, /oa/, /ow/, /ou/, /ie/, /ue/, /oe/, /[aeiou]_?e$/];

    function phonetics(word) {
        const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!w) return { attack: 0.4, sustain: 0.5, friction: 0 };

        let plosive = 0, sibilant = 0, sonorant = 0;
        for (const ch of w) {
            if (PLOSIVES.includes(ch)) plosive++;
            else if (SIBILANTS.includes(ch)) sibilant++;
            else if (SONORANTS.includes(ch)) sonorant++;
        }
        const len = w.length || 1;

        // An onset plosive dominates how a word "starts" — that's the attack.
        const onsetPlosive = PLOSIVES.includes(w[0]) ? 0.45 : 0;
        const codaPlosive = PLOSIVES.includes(w[w.length - 1]) ? 0.25 : 0;
        const attack = Math.min(1, onsetPlosive + codaPlosive + (plosive / len) * 0.8);

        const longVowel = LONG_VOWEL_PATTERNS.some(re => re.test(w)) ? 0.35 : 0;
        const sustain = Math.min(1, (sonorant / len) * 1.1 + longVowel + (w.endsWith('e') ? 0.1 : 0));

        return { attack, sustain, friction: sibilant / len };
    }

    // --- 3. Prosody ---------------------------------------------------------
    // English stress heuristics: most 2-syllable nouns/adjectives are trochaic
    // (STRONG-weak); common verb prefixes and -ing/-ed shift the pattern.
    const VERB_PREFIXES = ['be','de','re','in','en','ex','pre','pro','sub','con','com','a','ad','ob','per','sur','with'];

    function stressPattern(word, syllableCount) {
        const w = String(word || '').toLowerCase();
        const n = Math.max(1, syllableCount || 1);
        if (n === 1) return [1];

        let primary = 0; // default trochaic: stress first
        if (n === 2) {
            if (VERB_PREFIXES.some(p => w.startsWith(p) && w.length > p.length + 2)) primary = 1;
            if (/^(a|be|re|un)/.test(w) && /(ing|ed|s)$/.test(w)) primary = 1;
        } else if (n >= 3) {
            // -tion/-sion/-ity/-ical pull stress to the antepenult
            if (/(tion|sion|ity|ical|ogy|graphy)$/.test(w)) primary = n - 2;
            else primary = 0;
        }

        const pattern = new Array(n).fill(0.35);
        pattern[Math.min(n - 1, primary)] = 1;
        // Secondary stress on alternating syllables away from the primary
        for (let i = 0; i < n; i++) {
            if (i !== primary && Math.abs(i - primary) % 2 === 0) pattern[i] = 0.6;
        }
        return pattern;
    }

    // --- 4. Character assembly ---------------------------------------------
    function analyzeWord(word, options = {}) {
        const raw = String(word || '').toLowerCase().replace(/[^a-z'-]/g, '');
        const ph = phonetics(raw);

        const c = {
            word: raw,
            motion: 0.35,
            attack: ph.attack,
            sustain: ph.sustain,
            weight: 0.4,
            brightness: 0.5,
            tension: 0.3,
            valence: 0,
            arousal: 0,
            contour: 0,
            fields: [],
            matched: false
        };

        let hits = 0;
        for (const [name, def] of Object.entries(FIELDS)) {
            // Match the stem too, so "running"/"chased"/"shattered" still land.
            const inField = def.words.some(fw =>
                raw === fw ||
                raw === fw + 's' || raw === fw + 'd' || raw === fw + 'ed' ||
                raw === fw + 'ing' || raw === fw.replace(/e$/, '') + 'ing' ||
                raw === fw + 'y' || raw === fw + 'ly');
            if (!inField) continue;
            hits++;
            c.fields.push(name);
            for (const key of ['motion', 'attack', 'weight', 'brightness', 'tension', 'sustain']) {
                if (def[key] !== undefined) {
                    c[key] = hits === 1 ? def[key] : (c[key] + def[key]) / 2;
                }
            }
            if (def.valence !== undefined) c.valence += def.valence;
            if (def.arousal !== undefined) c.arousal += def.arousal;
            if (def.contour !== undefined) c.contour += def.contour;
        }
        c.matched = hits > 0;

        // Phonetics still colour matched words — they just don't override the
        // semantic field entirely.
        if (c.matched) {
            c.attack = Math.min(1, c.attack * 0.65 + ph.attack * 0.5);
            c.sustain = Math.min(1, c.sustain * 0.7 + ph.sustain * 0.45);
        } else {
            // Unmatched: phonetics + length carry the character. Long sonorant
            // words feel slower; short plosive words feel sharp and quick.
            c.motion = Math.min(1, 0.25 + ph.attack * 0.5 - ph.sustain * 0.2);
            c.weight = Math.min(1, 0.25 + raw.length / 14);
            c.arousal = Math.max(-1, Math.min(1, ph.attack * 0.6 - ph.sustain * 0.45));
        }

        c.valence = Math.max(-1, Math.min(1, c.valence));
        c.arousal = Math.max(-1, Math.min(1, c.arousal + ph.attack * 0.2 - ph.sustain * 0.2));
        c.contour = Math.max(-1, Math.min(1, c.contour));

        if (options.negated) { c.valence *= -0.85; c.tension = Math.min(1, c.tension + 0.15); }
        if (options.intensified) {
            c.arousal = Math.max(-1, Math.min(1, c.arousal * 1.4));
            c.attack = Math.min(1, c.attack * 1.25);
            c.motion = Math.min(1, c.motion * 1.2);
            c.tension = Math.min(1, c.tension * 1.3);
        }
        if (options.diminished) {
            c.arousal *= 0.5; c.attack *= 0.5; c.motion *= 0.6; c.sustain = Math.min(1, c.sustain + 0.2);
        }
        return c;
    }

    /**
     * Analyze a full phrase: per-word characters plus modifier propagation.
     */
    function analyzePhrase(text) {
        const tokens = String(text || '').toLowerCase().split(/[^a-z'-]+/).filter(Boolean);
        const out = [];
        let pendingIntensify = false, pendingDiminish = false, pendingNegate = false;

        for (const tok of tokens) {
            if (INTENSIFIERS.includes(tok)) { pendingIntensify = true; continue; }
            if (DIMINISHERS.includes(tok)) { pendingDiminish = true; continue; }
            if (NEGATORS.includes(tok)) { pendingNegate = true; continue; }

            const ch = analyzeWord(tok, {
                intensified: pendingIntensify,
                diminished: pendingDiminish,
                negated: pendingNegate
            });
            out.push(ch);
            pendingIntensify = pendingDiminish = pendingNegate = false;
        }

        // Adjectives colour the noun that follows: "scary chase" vs "happy chase".
        // A strongly-charged word bleeds part of its character into its neighbour.
        for (let i = 0; i < out.length - 1; i++) {
            const a = out[i], b = out[i + 1];
            if (!a.matched) continue;
            const bleed = 0.45;
            b.tension = Math.min(1, b.tension * (1 - bleed) + a.tension * bleed);
            b.brightness = Math.min(1, b.brightness * (1 - bleed) + a.brightness * bleed);
            b.valence = Math.max(-1, Math.min(1, b.valence * (1 - bleed) + a.valence * bleed));
            b.arousal = Math.max(-1, Math.min(1, b.arousal * (1 - bleed * 0.8) + a.arousal * bleed * 0.8));
            b.attack = Math.min(1, b.attack * (1 - bleed * 0.6) + a.attack * bleed * 0.6);
            b.motion = Math.min(1, b.motion * (1 - bleed * 0.6) + a.motion * bleed * 0.6);
        }
        return out;
    }

    // --- 5. Rhythm cells ----------------------------------------------------
    // A cell is the note-length pattern for ONE word. Choosing a whole cell per
    // word (instead of one duration per note from an energy threshold) is what
    // makes "chase" scan differently from "drift".
    const CELLS = {
        // driving, urgent — short values, forward push
        drive:      [[0.5, 0.5], [0.25, 0.25, 0.5], [0.5, 0.25, 0.25], [0.75, 0.25], [0.25, 0.25, 0.25, 0.25]],
        // sharp hit then space
        strike:     [[0.25, 1.75], [0.5, 1.5], [0.25, 0.75], [0.5, 2.5]],
        // gentle lilt
        lilt:       [[1.5, 0.5], [1, 0.5], [0.75, 0.75], [1.5, 1]],
        // sustained, floating
        sustain:    [[3], [2], [4], [2, 2], [3, 1]],
        // conversational default
        speech:     [[1, 0.5], [0.5, 1], [1, 1], [1.5, 0.5], [0.75, 0.25]],
        // heavy, deliberate
        weighted:   [[2, 1], [1.5, 1.5], [2, 2], [3, 1]]
    };

    function cellFamilyFor(ch) {
        if (ch.attack > 0.62 && ch.motion > 0.55) return 'strike';
        if (ch.motion > 0.55 || ch.arousal > 0.4) return 'drive';
        if (ch.motion < 0.22 || ch.sustain > 0.6) return 'sustain';
        if (ch.weight > 0.65) return 'weighted';
        if (ch.valence > 0.25 && ch.arousal < 0.2) return 'lilt';
        return 'speech';
    }

    /**
     * Build the rhythm for one word: pick a family from character, pick a
     * variant with the supplied RNG, then stretch it to the syllable count and
     * bias long values toward stressed syllables.
     */
    function rhythmFor(ch, syllableCount, rng, opts = {}) {
        const rand = typeof rng === 'function' ? rng : Math.random;
        const n = Math.max(1, syllableCount || 1);
        const family = cellFamilyFor(ch);
        const variants = CELLS[family] || CELLS.speech;
        // Offset the variant by the WORD itself, so two words in the same
        // rhythmic family ("still", "drift") don't scan identically.
        let wh = 0;
        for (const c of String(ch.word || '')) wh = ((wh << 5) - wh + c.charCodeAt(0)) | 0;
        const vi = (Math.floor(rand() * variants.length) + Math.abs(wh)) % variants.length;
        let cell = variants[vi].slice();
        // Keep the cell's ORIGINAL shape. Fitting it to the syllable count
        // merges a one-syllable word's cell down to a single value — "time"
        // becomes [2] and every trace of [1.5, 0.5] is gone. The scansion below
        // still needs one value per syllable, but the gesture is the word's
        // rhythmic character and callers need it to develop a line beyond the
        // literal syllables the text supplies.
        const gesture = variants[vi].slice();

        // Fit the cell to the syllable count.
        if (cell.length < n) {
            while (cell.length < n) {
                // Subdivide the longest value so added syllables stay in character.
                let maxI = 0;
                for (let i = 1; i < cell.length; i++) if (cell[i] > cell[maxI]) maxI = i;
                const half = cell[maxI] / 2;
                cell.splice(maxI, 1, half, half);
            }
        } else if (cell.length > n) {
            // Merge trailing values so the word keeps its total length.
            while (cell.length > n) {
                const last = cell.pop();
                cell[cell.length - 1] += last;
            }
        }

        // Stress shaping: lengthen stressed syllables, shorten unstressed ones,
        // keeping the word's total duration stable.
        const stress = stressPattern(ch.word, n);
        const total = cell.reduce((s, x) => s + x, 0);
        let wh2 = 0;
        for (const c of String(ch.word || '')) wh2 = ((wh2 << 5) - wh2 + c.charCodeAt(0)) | 0;
        // Per-word stress contrast: "crash" bites harder than "chase" even when
        // both land in the same rhythmic family.
        const contrast = 0.7 + ((Math.abs(wh2) % 7) / 10);
        const weights = stress.map(s => 0.55 + s * 0.9 * contrast);
        const wSum = weights.reduce((s, x) => s + x, 0);
        cell = cell.map((_, i) => (total * weights[i]) / wSum);

        // Quantize to a musical grid so notation stays clean.
        const grid = opts.allowSixteenths === false ? 0.5 : 0.25;
        cell = cell.map(v => {
            const q = Math.max(grid, Math.round(v / grid) * grid);
            return Math.min(4, q);
        });

        // `variants` is the family's whole vocabulary — the material a line
        // engine can develop with while staying in the word's character.
        return {
            durations: cell,
            family,
            stress,
            gesture,
            variants: variants.map(v => v.slice())
        };
    }

    /** The rhythmic vocabulary for a family, for callers that develop a line. */
    function cellsFor(family) {
        const v = CELLS[family] || CELLS.speech;
        return v.map(c => c.slice());
    }

    // --- 6. Phrase-level character and emotional tone -----------------------
    /**
     * Aggregate a phrase's words into one character. Content words that the
     * fields recognised count for more than filler, and the most extreme word
     * pulls the phrase toward itself — "scary chase" should read as tense even
     * though "chase" alone is merely energetic.
     */
    function phraseCharacter(text) {
        const chars = analyzePhrase(text);
        const agg = {
            motion: 0.35, attack: 0.4, sustain: 0.5, weight: 0.4,
            brightness: 0.5, tension: 0.3, valence: 0, arousal: 0, contour: 0,
            matchedCount: 0, words: chars
        };
        if (!chars.length) return agg;

        let wSum = 0;
        const acc = { motion: 0, attack: 0, sustain: 0, weight: 0, brightness: 0, tension: 0, valence: 0, arousal: 0, contour: 0 };
        for (const c of chars) {
            const w = c.matched ? 1.6 : 0.7;
            wSum += w;
            if (c.matched) agg.matchedCount++;
            for (const k of Object.keys(acc)) acc[k] += (c[k] || 0) * w;
        }
        for (const k of Object.keys(acc)) agg[k] = acc[k] / (wSum || 1);

        // Extremes matter more than averages in music: let the single most
        // charged word pull the phrase toward its own tension/arousal.
        const peak = chars.reduce((best, c) =>
            (Math.abs(c.arousal) + c.tension > Math.abs(best.arousal) + best.tension) ? c : best, chars[0]);
        agg.tension = Math.min(1, agg.tension * 0.55 + peak.tension * 0.65);
        agg.arousal = Math.max(-1, Math.min(1, agg.arousal * 0.6 + peak.arousal * 0.6));
        agg.motion = Math.min(1, Math.max(agg.motion, peak.motion * 0.85));
        return agg;
    }

    /**
     * Map an aggregate character onto the emotional-tone vocabulary the
     * progression library and scale chooser already speak.
     */
    function toneFor(agg) {
        if (!agg) return 'balanced';
        const { tension, arousal, valence, motion, brightness } = agg;

        if (tension > 0.6 && arousal > 0.35) return valence < -0.3 ? 'angry' : 'intense';
        if (tension > 0.55 && brightness < 0.4) return 'dark';
        if (valence < -0.4 && arousal < 0.1) return 'sad';
        if (valence < -0.25 && tension > 0.4) return 'dark';
        if (tension > 0.45 && Math.abs(valence) < 0.3) return 'mysterious';
        if (motion > 0.6 && valence > 0.15) return 'playful';
        if (motion > 0.6) return 'intense';
        if (brightness > 0.65 && valence > 0.3) return 'joyful';
        if (valence > 0.3) return 'hopeful';
        if (motion < 0.25 && valence >= 0) return 'calm';
        if (motion < 0.25) return 'dreamy';
        return 'balanced';
    }

    const api = { analyzeWord, analyzePhrase, phraseCharacter, toneFor, rhythmFor, cellFamilyFor, cellsFor, stressPattern, phonetics, FIELDS };
    if (typeof window !== 'undefined') {
        window.WordCharacterEngine = api;
        // Console helper: __wordChar('scary chase')
        window.__wordChar = function (text) {
            const chars = analyzePhrase(text);
            console.table(chars.map(c => ({
                word: c.word, fields: c.fields.join('+') || '—',
                motion: +c.motion.toFixed(2), attack: +c.attack.toFixed(2), sustain: +c.sustain.toFixed(2),
                tension: +c.tension.toFixed(2), valence: +c.valence.toFixed(2), arousal: +c.arousal.toFixed(2),
                cell: cellFamilyFor(c)
            })));
            return chars;
        };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
