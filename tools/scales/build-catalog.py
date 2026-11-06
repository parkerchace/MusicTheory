#!/usr/bin/env python3
"""Build scales-data-embedded.js from the current data, the cached scale pages and the research tables.

    python3 tools/scales/build-catalog.py --pages <dir with ring-pages.json> --research <dir> [--write]

Without --write it only writes the review sheet. The page cache and the research tables live outside
the repository and are never committed; the app ships only the facts it needs, with no source text.

What the build decides, in this order:
  1. every set of notes that contains the root is one entry, 2,048 in all
  2. an id that exists today keeps the notes it resolves to today, in the same key order
  3. a display name is the best-known name: the hand list below first, then today's name where a
     source spells it, then the best sourced name, then an invented one when nothing else exists
  4. every other name is kept as an alias with its kind, so search still finds the old spelling
  5. raga parents, ascent/descent and maqam families come from the research tables; a parent the
     sources disagree on is stored as main + alternates; a note set no source supports is flagged
"""
import argparse, json, os, re, sys, unicodedata, collections

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(APP, 'scales-data-embedded.js')
LEGACY = os.path.join(HERE, 'legacy-scales.json')   # the list the app shipped before this build existed
NOTE = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

# ---------------------------------------------------------------- the hand list of well-known names
# One line per set of notes. These are the names a learner meets in books and lessons; the list
# marks the scales the word generator may choose from. A scale the app already had keeps the name it
# had (Superlocrian stays Superlocrian; "Altered" becomes one of its other names): the hand-list name
# is only used for a scale that is new, or whose old name sat on the wrong notes.
WELL_KNOWN = """
0 2 4 5 7 9 11      Major
0 2 3 5 7 9 10      Dorian
0 1 3 5 7 8 10      Phrygian
0 2 4 6 7 9 11      Lydian
0 2 4 5 7 9 10      Mixolydian
0 2 3 5 7 8 10      Aeolian
0 1 3 5 6 8 10      Locrian
0 2 3 5 7 8 11      Harmonic Minor
0 1 3 5 6 9 10      Locrian ♮6
0 2 4 5 8 9 11      Ionian ♯5
0 2 3 6 7 9 10      Dorian ♯4
0 1 4 5 7 8 10      Phrygian Dominant
0 3 4 6 7 9 11      Lydian ♯2
0 1 3 4 6 8 9       Ultralocrian
0 2 3 5 7 9 11      Melodic Minor
0 1 3 5 7 9 10      Dorian ♭2
0 2 4 6 8 9 11      Lydian Augmented
0 2 4 6 7 9 10      Lydian Dominant
0 2 4 5 7 8 10      Mixolydian ♭6
0 2 3 5 6 8 10      Half-Diminished
0 1 3 4 6 8 10      Altered
0 2 4 5 7 8 11      Harmonic Major
0 2 3 5 6 9 10      Dorian ♭5
0 1 3 4 7 8 10      Phrygian ♭4
0 2 3 6 7 9 11      Lydian ♭3
0 1 4 5 7 9 10      Mixolydian ♭2
0 3 4 6 8 9 11      Lydian Augmented ♯2
0 1 3 5 6 8 9       Locrian 𝄫7
0 1 4 5 7 8 11      Double Harmonic
0 2 3 6 7 8 11      Hungarian Minor
0 1 3 5 7 8 11      Neapolitan Minor
0 1 3 5 7 9 11      Neapolitan Major
0 3 4 6 7 9 10      Hungarian Major
0 1 4 6 8 10 11     Enigmatic
0 2 4 5 6 8 10      Major Locrian
0 2 4 6 8 10        Whole Tone
0 2 3 5 6 8 9 11    Diminished
0 1 3 4 6 7 9 10    Octatonic
0 3 4 7 8 11        Augmented
0 1 2 3 4 5 6 7 8 9 10 11   Chromatic
0 2 4 7 9           Major Pentatonic
0 2 5 7 10          Suspended Pentatonic
0 3 5 7 10          Minor Pentatonic
0 3 5 6 7 10        Blues
0 2 3 4 7 9         Blues Major
0 2 4 5 7 9 10 11   Bebop Dominant
0 2 4 5 7 8 9 11    Bebop Major
0 2 3 5 7 8 9 11    Bebop Minor
0 2 3 4 5 7 9 10    Bebop Dorian
0 2 4 6 9 10        Prometheus
0 1 4 6 7 10        Tritone
0 2 4 6 8 10 11     Leading Whole Tone
0 1 3 4 5 6 8 10    Spanish 8-Tone
0 1 5 7 8           In
0 2 5 7 9           Yo
0 2 3 7 8           Hirajōshi
0 1 5 6 10          Iwato
0 1 5 7 10          Insen
0 2 4 7 9 11        Major Hexatonic
0 2 3 5 7 10        Minor Hexatonic
"""

# Names that should never be shown as a display name, even if they are the only ones a page lists.
NEVER_DISPLAY = re.compile(r'gypsy|gipsy', re.I)

# Ring's traditions, folded into the kinds the app stores. Unlisted traditions count as "other".
KIND = {
    'Western': 'western', 'Western Altered': 'western', 'Western Mixed': 'western',
    'Western Chromatic': 'western', 'Medieval': 'western', 'Numbered Gregorian': 'western', 'Ancient Greek': 'western',
    'Schenkerian': 'western', 'Invented Pseudoclassical': 'western', 'Named After Composers': 'western', 'Modern': 'western',
    'Mirror': 'western', 'Messiaen': 'messiaen',
    # built by a scheme ("Minor Add ♭9/♯11 Mode I", "Chord 2"): true, but a poor name to show first
    'Western Modern': 'systematic', 'Chord Names': 'systematic', 'Intervals': 'systematic',
    'Jazz and Blues': 'jazz',
    'Hindustani': 'hindustani', 'Hindustani Thaat': 'hindustani',
    'Carnatic': 'carnatic', 'Carnatic Melakarta': 'carnatic', 'Carnatic Numbered Melakarta': 'carnatic',
    'Arabic': 'arabic', 'Egyptian': 'arabic', 'Turkish': 'turkish', 'Ottoman Turkish Unverified': 'turkish',
    'Modern Greek': 'greek', 'Greek Unverified': 'greek', 'Iran': 'persian', 'Azerbaijan': 'azerbaijani',
    'Ethiopian': 'ethiopian', 'African': 'african', 'Japanese': 'japanese', 'Japanese Unverified': 'japanese',
    'Chinese': 'chinese', 'Korean': 'korean', 'Indonesian': 'seasian', 'Thailand': 'seasian', 'Vietnamese': 'seasian',
    'Myanmar': 'seasian', 'Southeast Asia': 'seasian', 'Jewish': 'jewish', 'Flamenco': 'spanish',
    'East European': 'european', 'North America': 'american',
    'Exoticisms': 'outsider', 'Western Pseudo-Japanese': 'outsider', 'Unsorted': 'other',
    'Zeitler': 'invented', 'Dozenal': 'invented', 'Compound Chords': 'invented', 'Bedwell': 'invented',
    'Cochrane': 'invented', 'Clint Goss': 'invented', 'Set Theory': 'invented', 'Altered Raga': 'invented',
    'Raga Added Mode': 'invented', 'Western Enumerated': 'invented', '12Tone': 'invented', 'Varini': 'invented',
    'Incoherent Classification': 'invented',
}
UNVERIFIED_TRAD = {'Ottoman Turkish Unverified', 'Greek Unverified', 'Japanese Unverified'}
# Invented names kept as aliases: Zeitler's are readable words; number-like schemes only add noise.
ALIAS_SKIP_TRAD = {'Dozenal', 'Compound Chords', 'Bedwell', 'Cochrane', 'Clint Goss', '12Tone', 'Varini'}
TRAD_RANK = ['western', 'jazz', 'messiaen', 'carnatic', 'hindustani', 'japanese', 'chinese', 'spanish', 'ethiopian',
             'arabic', 'turkish', 'greek', 'persian', 'azerbaijani', 'jewish', 'korean', 'seasian', 'african',
             'european', 'american', 'systematic', 'other']
THAAT_SET = {'Bilawal': [0, 2, 4, 5, 7, 9, 11], 'Bilaval': [0, 2, 4, 5, 7, 9, 11], 'Kalyan': [0, 2, 4, 6, 7, 9, 11],
             'Khamaj': [0, 2, 4, 5, 7, 9, 10], 'Bhairav': [0, 1, 4, 5, 7, 8, 11], 'Poorvi': [0, 1, 4, 6, 7, 8, 11],
             'Purvi': [0, 1, 4, 6, 7, 8, 11], 'Marwa': [0, 1, 4, 6, 7, 9, 11], 'Marva': [0, 1, 4, 6, 7, 9, 11],
             'Kafi': [0, 2, 3, 5, 7, 9, 10], 'Asavari': [0, 2, 3, 5, 7, 8, 10], 'Bhairavi': [0, 1, 3, 5, 7, 8, 10],
             'Todi': [0, 1, 3, 6, 7, 8, 11]}
# Ids that code asks for today although no data holds them: engines keep lists like 'altered_diminished'
# that silently start to apply once such an id exists. A new id may only take one of the allowed ones.
CODE_FILES = ['music-theory-engine.js', 'approach-engine.js', 'scale-colour.js', 'number-generator.js', 'scale-helper.js',
              'scale-relationship-explorer.js', 'learn-scales.js', 'learn-inversions.js', 'course.js', 'course-theory.js',
              'arc-ui-init.js', 'modular-app.js', 'piano-visualizer.js', 'qwerty-chords.js', 'context-engine.js']
# These ids mean the same scale in the engine's lists as the hand list names, so they may wake up.
DORMANT_ALLOWED = {'whole_tone', 'bebop_dominant', 'bebop_dorian', 'chromatic', 'altered', 'lydian_dominant',
                   'hungarian_minor', 'blues', 'octatonic_dim', 'leading_whole_tone', 'locrian_bb7'}


def ids_named_in_code():
    found = set()
    for f in CODE_FILES:
        path = os.path.join(APP, f)
        if os.path.exists(path):
            text = open(path, encoding='utf-8').read()
            found |= set(re.findall(r"'([a-z][a-z0-9]*(?:_[a-z0-9]+)+)'", text))
            found |= set(re.findall(r'"([a-z][a-z0-9]*(?:_[a-z0-9]+)+)"', text))
    return found

# Names the research settled on a different set than the one that carries them today.
MOVE_NAME = {  # page number -> name that must not be its display name
    2189: 'Rāga Hamsadhvani',   # Hamsadhvani is C D E G B
    2481: 'Rāga Paraju',        # Paraju belongs on the Mayamalavagowla set
    931: 'Rāga Kalakanthi',     # only C D♭ E F G A♭ A is supported
}
FORCE_ALIAS = {2197: ('Rāga Hamsadhvani', 'carnatic'), 2483: ('Rāga Paraju', 'carnatic')}


def fold(s):
    s = unicodedata.normalize('NFKD', str(s or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub('[♭♯♮𝄫𝄪]', '', s)
    return re.sub(r'[^a-z0-9]', '', s.lower())


def namekey(s):
    """Like fold, but ♭/♯ survive as letters so Lydian ♭3 and Lydian ♯3 stay distinct."""
    s = str(s or '').replace('♭', 'b').replace('♯', 's').replace('♮', 'n').replace('𝄫', 'bb').replace('𝄪', 'ss')
    s = s.replace('∅', 'o').replace('◦', 'd').replace('+', 'p').replace('Δ', 'm').replace('∆', 'm')   # chord-name symbols stay distinct
    return fold(s)


def slug(name):
    s = unicodedata.normalize('NFKD', name)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('♭', 'b').replace('♯', 's').replace('♮', 'n').replace('𝄫', 'bb').replace('𝄪', 'ss')
    s = re.sub(r"['’]", '', s)
    s = re.sub(r'[^A-Za-z0-9]+', '_', s).strip('_').lower()
    return s or 'scale'


def bits(iv):
    return sum(1 << i for i in iv)


def ivals(n):
    return [k for k in range(12) if n >> k & 1]


def parse_current():
    d = json.load(open(LEGACY, encoding='utf-8'))
    out = []
    for r in d['scales']:
        iv = r['intervals']
        if isinstance(iv, str):  # six entries store a rootless pair, "[4, 8]"
            iv = sorted(set([0] + [int(t) % 12 for t in iv.strip('[]').split(',')]))
        out.append({'id': r['id'], 'name': r['name'], 'n': bits(iv), 'essential': bool(r.get('essential')),
                    'baseScale': True, 'repaired': isinstance(r['intervals'], str)})
    return out


def tsv(path):
    if not os.path.exists(path):
        return []
    rows = [l.rstrip('\n').split('\t') for l in open(path, encoding='utf-8')]
    head = rows[0]
    return [dict(zip(head, r)) for r in rows[1:] if len(r) >= 3]


# ---------------------------------------------------------------- sargam -> semitones
CARN = {'S': 0, 'R1': 1, 'R2': 2, 'R3': 3, 'G1': 2, 'G2': 3, 'G3': 4, 'M1': 5, 'M2': 6, 'P': 7,
        'D1': 8, 'D2': 9, 'D3': 10, 'N1': 9, 'N2': 10, 'N3': 11}
SUB = str.maketrans('₁₂₃', '123')


def parse_carnatic(text):
    """'S R₂ G₃ P N₃ Ṡ' -> [0,2,4,7,11,12]; None when a swara has no number (ambiguous)."""
    out = []
    for tok in re.findall(r'[SRGMPDN][̣̇]?[₁₂₃123]?[̣̇]?', unicodedata.normalize('NFD', text.translate(SUB))):
        base = unicodedata.normalize('NFD', tok)
        letter = base[0]
        num = ''.join(c for c in base if c.isdigit())
        up = '̇' in base
        low = '̣' in base
        key = letter + num
        if letter in 'SP':
            key = letter
        if key not in CARN:
            return None
        v = CARN[key] + (12 if up else 0) - (12 if low else 0)
        out.append(v)
    return out if len(out) >= 3 else None


def parse_hindustani(text, source):
    """Sargam to a list of semitones plus the positions of every Ma. Pages differ: Wikipedia marks komal
    with a line below and tivra Ma with a line above or a lowercase m; tanarang writes komal as lowercase
    r g d n, shuddha Ma as m and tivra Ma as M. Dots, commas and apostrophes mark octaves."""
    tanarang = 'tanarang' in source
    text = re.sub(r'\(komal\)', '\u0331', text)
    text = re.sub(r'\(shuddha\)', '', text)
    text = re.sub(r'\b(Sa|Re|Ga|Ma|Pa|Dha|Ni)\b', lambda m: m.group(1)[0], text)
    text = re.sub(r',([SRGMPDNsrgmpdn])', '\\1\u0323', text)  # ",N" is the lower-octave Ni
    out, ma = [], []
    for tok in re.findall(r"[SRGMPDNsrgmpdn][\u0300-\u036f]*[']?[\u0300-\u036f]*", unicodedata.normalize('NFD', text)):
        letter = tok[0].upper()
        lower = tok[0].islower()
        marks = tok[1:]
        komal = '\u0331' in marks or '\u0332' in marks or (lower and letter in 'RGDN')
        up = '\u0307' in marks or "'" in marks
        low = '\u0323' in marks
        base = {'S': 0, 'R': 2, 'G': 4, 'M': 5, 'P': 7, 'D': 9, 'N': 11}[letter]
        if komal and letter in 'RGDN':
            base -= 1
        if letter == 'M':
            marked = '\u0304' in marks or '\u0301' in marks
            guess = marked or ((not lower) if tanarang else lower)
            ma.append((len(out), guess))
        out.append(base + (12 if up else 0) - (12 if low else 0))
    if len(out) < 3:
        return None
    return out, ma


def resolve_ma(parsed, allowed):
    """Pick the reading of each Ma that keeps the path inside the parent; the page's own convention first."""
    if not parsed:
        return None
    path, ma = parsed
    import itertools
    options = [[g, not g] for _, g in ma]
    best = None
    for choice in (itertools.product(*options) if ma else [()]):
        cand = list(path)
        for (i, _), tivra in zip(ma, choice):
            cand[i] = path[i] + (1 if tivra else 0)
        outside = sum(1 for v in cand if v % 12 not in allowed)
        if best is None or outside < best[0]:
            best = (outside, cand)
    return best[1] if best and best[0] <= 2 else None


def within(path, allowed, slack=2):
    """True when a parsed path stays inside the parent's set, allowing a couple of foreign notes: ragas
    like Jog use both forms of a swara, one per direction, which no thaat can hold."""
    return sum(1 for v in path if v % 12 not in allowed) <= slack


# ---------------------------------------------------------------- main build
def build(pages_dir, research_dir, write):
    P = json.load(open(os.path.join(pages_dir, 'ring-pages.json'), encoding='utf-8'))
    current = parse_current()
    review = {'well_known': [], 'renamed': [], 'new_ids': [], 'moved_ids': [], 'unconfirmed': [], 'parse_failed': [],
              'research_mismatch': [], 'display_fallback': collections.Counter()}

    # 1. well-known names by set
    wk = {}
    for line in WELL_KNOWN.strip().splitlines():
        if 'skip' in line:
            continue
        parts = line.split()
        nums = [p for p in parts if p.isdigit()]
        name = ' '.join(parts[len(nums):])
        n = bits([int(x) for x in nums])
        if n in wk and wk[n] != name:
            raise SystemExit(f'well-known list names {n} twice: {wk[n]} / {name}')
        wk[n] = name

    # 2. today's ids: last copy wins, kept at the first copy's position
    first_pos, keeper, any_essential = {}, {}, collections.defaultdict(bool)
    for i, r in enumerate(current):
        first_pos.setdefault(r['id'], i)
        keeper[r['id']] = r
        any_essential[r['id']] |= r['essential']
    # a repaired rootless entry may land on a set another id already holds; that id loaded as broken
    # data today, so it is merged into the proper entry rather than kept as a second id for one set
    kept_sets, dropped = {}, []
    for id_ in sorted(keeper, key=lambda i: (keeper[i]['repaired'], first_pos[i])):
        r = keeper[id_]
        if r['n'] in kept_sets:
            dropped.append((id_, r['name'], kept_sets[r['n']]['id']))
            continue
        kept_sets[r['n']] = r
    order_ids = sorted((r['id'] for r in kept_sets.values()), key=lambda i: first_pos[i])
    review['dropped_ids'] = dropped
    renamed_copies = [r for r in current if keeper[r['id']] is not r]

    # 3. names per set, from the pages
    def page_names(n):
        out = []
        for x in P[str(n)]['names']:
            kind = KIND.get(x['trad'], 'other')
            out.append({'t': x['name'], 'k': kind, 'trad': x['trad'], 'cites': x.get('cites') or 0,
                        'warn': bool(x.get('err')), 'u': x['trad'] in UNVERIFIED_TRAD})
        return out

    used_names = {}
    entries = {}
    mela_names = {}
    for row in tsv(os.path.join(research_dir, 'melakarta-72.tsv')):
        if row.get('number', '').isdigit() and row.get('name_as_in_source'):
            mela_names[int(row['number'])] = row['name_as_in_source']
    THAAT_SPELLING = {'bilaval': 'Bilawal', 'bilawal': 'Bilawal', 'kalyan': 'Kalyan', 'khamaj': 'Khamaj', 'bhairav': 'Bhairav',
                      'poorvi': 'Poorvi', 'purvi': 'Poorvi', 'marwa': 'Marwa', 'marva': 'Marwa', 'kafi': 'Kafi',
                      'asavari': 'Asavari', 'bhairavi': 'Bhairavi', 'todi': 'Todi'}

    def take_name(n, cand):
        if not cand or NEVER_DISPLAY.search(cand):
            return False
        key = namekey(cand)
        if key in used_names and used_names[key] != n:
            return False
        used_names[key] = n
        return True

    def choose_display(n, today_name):
        names = page_names(n)
        blocked = MOVE_NAME.get(n)
        # (a) today's name, in the source's spelling when a page lists it
        if today_name and today_name != blocked and not NEVER_DISPLAY.search(today_name):
            listed = [x for x in names if fold(x['t']) == fold(today_name)]
            hit = [x for x in listed if x['k'] not in ('invented', 'outsider')]
            other = [x for x in listed if x['k'] in ('invented', 'outsider')]
            for x in hit:   # a page may list several accidental readings; take the first still free
                if take_name(n, x['t']):
                    return x['t'], 'today, spelled by source'
            for x in other:
                if take_name(n, x['t']):
                    return x['t'], 'today, ' + x['k'] + ' name'
            if not listed and take_name(n, today_name):
                return today_name, 'today, unverified'
        # (b) the hand list, for a new scale or one whose old name had to move
        if n in wk and take_name(n, wk[n]):
            return wk[n], 'well-known'
        # (c) best sourced name: unflagged first, then by kind, then most cited
        real = [x for x in names if x['k'] not in ('invented', 'outsider', 'other') and x['t'] != blocked]
        real.sort(key=lambda x: (x['warn'], x['u'], TRAD_RANK.index(x['k']) if x['k'] in TRAD_RANK else 99, -x['cites']))
        for x in real:
            if take_name(n, x['t']):
                return x['t'], 'sourced ' + x['k']
        # (d) an invented name: Zeitler's words first
        inv = [x for x in names if x['trad'] == 'Zeitler'] + [x for x in names if x['k'] == 'invented' and x['trad'] != 'Zeitler']
        for x in inv:
            if take_name(n, x['t']):
                return x['t'], 'invented'
        for x in names:
            if take_name(n, x['t']):
                return x['t'], 'any'
        title = P[str(n)]['title']
        for suffix in ('', ' II', ' III', ' IV'):
            if take_name(n, title + suffix):
                return title + suffix, 'title'
        raise SystemExit(f'no free display name for page {n}')

    # well-known sets first so their names cannot be taken by another set
    todo = sorted(range(1, 4096, 2), key=lambda n: (0 if n in wk else 1 if n in kept_sets else 2, n))
    for n in todo:
        today = kept_sets[n]['name'] if n in kept_sets else None
        name, how = choose_display(n, today)
        review['display_fallback'][how] += 1
        aliases = []
        seen = {fold(name)}
        for x in page_names(n):
            if x['trad'] in ALIAS_SKIP_TRAD:
                continue
            key = fold(x['t'])
            if key in seen:
                continue
            seen.add(key)
            a = [x['t'], x['k']]
            if x['u'] or x['warn']:
                a.append('u')
            aliases.append(a)
        if today and fold(today) not in seen:
            aliases.append([today, 'legacy'])
            seen.add(fold(today))
        if n in wk and fold(wk[n]) not in seen:
            aliases.insert(0, [wk[n], 'jazz' if re.search(r'bebop|altered|blues|lydian dominant', wk[n], re.I) else 'western'])
            seen.add(fold(wk[n]))
        if n in FORCE_ALIAS and fold(FORCE_ALIAS[n][0]) not in seen:
            aliases.append(list(FORCE_ALIAS[n]))
        kind = next((x['k'] for x in page_names(n) if fold(x['t']) == fold(name) and x['k'] not in ('invented', 'outsider')), None) \
            or ('western' if n in wk else next((x['k'] for x in page_names(n) if fold(x['t']) == fold(name)), 'other'))
        rec = {'name': name, 'kind': kind, 'intervals': ivals(n), 'noteCount': bin(n).count('1'), 'aliases': aliases}
        if n in wk:
            rec['wellKnown'] = True
        mel = [x for x in P[str(n)]['names'] if x['trad'] == 'Carnatic Numbered Melakarta' and re.match(r'\d+', x['name'])]
        if mel:
            rec['melakarta'] = int(re.match(r'(\d+)', mel[0]['name']).group(1))
            if rec['melakarta'] in mela_names:
                rec['melaName'] = mela_names[rec['melakarta']]   # the name the 72-table gives, not Ring's
        entries[n] = rec
        if today and fold(today) != fold(name):
            review['renamed'].append((n, today, name, how))
        if how == 'well-known':
            review['well_known'].append((n, name, today or ''))

    # 4. research: raga parents and paths, maqam families
    by_fold = {}
    for n, rec in entries.items():
        by_fold.setdefault(fold(rec['name']), n)
        for a in rec['aliases']:
            by_fold.setdefault(fold(a[0]), n)

    def entry_for_path(raga):
        """The entry whose notes are the union of the sourced ascent and descent."""
        if 'pu' in raga and 'pd' in raga:
            return bits(sorted({v % 12 for v in raga['pu'] + raga['pd']}))
        return None

    def raga_key(name):
        """Spelling variants of one raga fold together: Bheempalasi / Bhimpalasi, Bageshree / Bageshri."""
        k = re.sub(r'\(.*?\)|\{.*?\}', '', fold(name))
        k = re.sub(r'^(raag|raga)', '', k)
        for a, b in (('ee', 'i'), ('oo', 'u'), ('aa', 'a'), ('w', 'v'), ('sh', 's'), ('h', ''), ('ri', 'ri')):
            k = k.replace(a, b)
        return k

    pending = []   # rows without a readable path wait until the rows with one have chosen their entry
    placed_by_key = {}

    def attach(n, raga):
        rec = entries[n]
        rec.setdefault('ragas', [])
        key = raga_key(raga['n'])
        placed_by_key.setdefault((raga['s'], key), n)
        for r in rec['ragas']:
            if r['s'] == raga['s'] and raga_key(r['n']) == key:
                for f, v in raga.items():   # merge what the other source adds
                    r.setdefault(f, v)
                return
        rec['ragas'].append(raga)

    def attach_later(n, raga):
        pending.append((n, raga))

    for row in tsv(os.path.join(research_dir, 'hindustani-findings.tsv')):
        name = row.get('raga_name_as_in_source', '')
        if name.startswith('(system)') or not row.get('thaat'):
            continue
        targets = [t.strip() for t in re.split(r'[;,/]| and ', row.get('our_scraped_name(s)', '')) if t.strip()] or [name]
        n = next((by_fold[fold(t)] for t in targets if fold(t) in by_fold), None)
        if n is None:
            n = by_fold.get(fold('Raag ' + name)) or by_fold.get(fold('Rāga ' + name))
        if n is None:
            continue
        thaat = row['thaat']
        alt = re.findall(r'\(or ([^)]+)\)', thaat) + re.findall(r'vs\.? (\w+)', thaat)
        main = re.sub(r'\s*\(.*', '', thaat).strip()
        main = THAAT_SPELLING.get(fold(main), main)
        alt = [THAAT_SPELLING.get(fold(a), a) for a in alt]
        raga = {'n': name, 's': 'h', 'p': main}
        if alt:
            raga['alt'] = alt
        src = row.get('source_url', '')
        allowed = set(THAAT_SET.get(main, range(12)))
        for col, key in (('aroha', 'pu'), ('avaroha', 'pd')):
            if row.get(col):
                raga['up' if key == 'pu' else 'dn'] = row[col]
                path = resolve_ma(parse_hindustani(row[col], src), allowed)
                if path and any(v % 12 == 0 for v in path):
                    raga[key] = path
                else:
                    review['parse_failed'].append(('h', name, row[col]))
        if row.get('jati'):
            raga['j'] = row['jati']
        by_notes = entry_for_path(raga)
        if by_notes is None:
            attach_later(n, raga)
            continue
        if by_notes != n:
            review['research_mismatch'].append((n, name, f'sourced notes are entry {by_notes}'))
        attach(by_notes, raga)

    mela_set = {}
    for row in tsv(os.path.join(research_dir, 'melakarta-72.tsv')):
        if row.get('number', '').isdigit() and row.get('pitch_classes'):
            mela_set[int(row['number'])] = [int(x) for x in row['pitch_classes'].split()]

    # One row per raga, from the best source: a checked article, then Wikipedia's list, then karnatik's
    # letter pages, then karnatik's rough list. The rough list carries several readings of one raga.
    def source_rank(row):
        u = row.get('source_url', '')
        if row.get('section', '') == 'SPECIFIC-CHECK': return 0
        if 'wikipedia' in u: return 1
        if 'janyalist2' in u: return 3
        return 2
    carnatic_rows = sorted(tsv(os.path.join(research_dir, 'carnatic-janya-findings.tsv')), key=source_rank)
    seen_raga = set()
    for row in carnatic_rows:
        key = raga_key(row.get('janya_name_as_in_source', ''))
        if key in seen_raga:
            continue
        seen_raga.add(key)
        if 'NO MATCH' in row.get('notes', ''):
            continue
        name = row.get('janya_name_as_in_source', '')
        ours = row.get('our_scraped_name(s)', '')
        # karnatik spells names as "dEvamanOhari"; show the page's own spelling instead when it matched one
        if re.search(r'[a-z][A-Z]', name) and ours:
            name = re.sub(r'\s*\(.*', '', ours.split(';')[0].split('/')[0]).strip() or name
        targets = [t.strip() for t in re.split(r'[;,/]', re.sub(r'\(.*?\)', '', ours)) if t.strip()] or [name]
        n = next((by_fold[fold(t)] for t in targets if fold(t) in by_fold), None)
        if n is None:
            n = by_fold.get(fold('Rāga ' + name)) or by_fold.get(fold(name))
        if n is None:
            continue
        parent = row.get('parent_melakarta', '')
        nums = re.findall(r'\b(\d{1,2})\b', parent)
        if not nums:
            continue
        raga = {'n': name, 's': 'c', 'p': int(nums[0])}
        if len(set(nums)) > 1:
            raga['alt'] = sorted({int(x) for x in nums[1:]} - {int(nums[0])})
        allowed = set(mela_set.get(int(nums[0]), range(12)))
        for col, key in (('arohana', 'pu'), ('avarohana', 'pd')):
            if row.get(col):
                raga['up' if key == 'pu' else 'dn'] = row[col]
                path = parse_carnatic(row[col])
                if path and within(path, allowed) and any(v % 12 == 0 for v in path):
                    raga[key] = path
                elif path:
                    review['parse_failed'].append(('c', name, row[col] + ' (outside parent ' + nums[0] + ')'))
        if row.get('type'):
            raga['j'] = re.sub(r'\s*\(.*', '', row['type'])
        if row.get('section', '') != 'SPECIFIC-CHECK':
            raga['w'] = 1  # list sources only; weakly supported
        by_notes = entry_for_path(raga)
        if by_notes is not None:
            if by_notes != n:
                review['research_mismatch'].append((n, name, f'sourced notes are entry {by_notes}'))
            attach(by_notes, raga)
        elif 'DIFFERS' in row.get('notes', ''):
            continue  # name matched by spelling only, and the source's notes are not ours
        else:
            attach_later(n, raga)
    for n, raga in pending:
        attach(placed_by_key.get((raga['s'], raga_key(raga['n'])), n), raga)

    # maqam families: by first word of the member name, from the research table
    fam_of = {}
    for row in tsv(os.path.join(research_dir, 'maqam-findings.tsv')):
        if row.get('system', '').startswith('Arabic') and row.get('member_name_as_in_source', '—') != '—':
            fam = row.get('family_group', '')
            if fam and not fam.startswith('('):
                fam_of[fold(row['member_name_as_in_source'])] = fam
    APPROX = {'Rast', 'Bayati', 'Sikah', 'Saba'}
    for n, rec in entries.items():
        for a in rec['aliases']:
            if a[1] == 'arabic':
                key = fold(a[0])
                fam = next((f for k, f in fam_of.items() if k and (key == k or key.startswith(k))), None)
                if fam:
                    rec.setdefault('maqam', {})[a[0]] = fam
                if 'u' not in a:
                    a.append('u')  # no source gives a 12-tone set for any maqam
                    review['unconfirmed'].append((n, a[0], 'maqam set unsourced'))
            if a[1] in ('persian',) and 'u' not in a:
                a.append('u')
                review['unconfirmed'].append((n, a[0], 'dastgah is not a scale; set unsourced'))
        if rec['name'] and any(a[0] == rec['name'] for a in rec['aliases']):
            pass

    # 5. ids
    out = []
    taken = set()
    for id_ in order_ids:
        r = keeper[id_]
        rec = dict(entries[r['n']])
        rec = {'id': id_, **rec, 'essential': any_essential[id_], 'baseScale': True}
        out.append(rec)
        taken.add(id_)
    first_8 = next((r['id'] for r in out if r['noteCount'] == 8), None)

    dormant = ids_named_in_code() - set(keeper) - DORMANT_ALLOWED
    review['dormant_avoided'] = []

    def new_id(name, n):
        base = slug(name)
        cand = base
        if cand in dormant:   # code already means something by this id; keep the new scale away from it
            review['dormant_avoided'].append((base, name))
            cand = f'{base}_n{n}'
        if cand in taken:
            cand = f'{base}_n{n}'
        taken.add(cand)
        return cand

    for r in renamed_copies:
        rec = entries[r['n']]
        id_ = new_id(rec['name'], r['n'])
        out.append({'id': id_, **rec, 'essential': False, 'baseScale': False})
        review['moved_ids'].append((r['id'], id_, rec['name']))
    for n in sorted(entries):
        if n in kept_sets or any(r['n'] == n for r in renamed_copies):
            continue
        rec = entries[n]
        id_ = new_id(rec['name'], n)
        out.append({'id': id_, **rec, 'essential': False, 'baseScale': False})
        review['new_ids'].append((n, id_, rec['name']))

    ids = [r['id'] for r in out]
    assert len(ids) == len(set(ids)) == 2048, (len(ids), len(set(ids)))
    assert len({bits(r['intervals']) for r in out}) == 2048
    assert first_8 == next(r['id'] for r in out if r['noteCount'] == 8)
    names = collections.Counter(namekey(r['name']) for r in out)
    dup = [k for k, v in names.items() if v > 1]
    assert not dup, dup[:10]

    # 6. write
    sheet = os.path.join(research_dir, 'review-sheet.md')
    with open(sheet, 'w', encoding='utf-8') as f:
        f.write('# Catalogue review sheet\n\n')
        f.write(f"Display names by rule: {dict(review['display_fallback'])}\n\n")
        f.write('## Well-known names (hand list)\n\n| notes | name | was |\n|---|---|---|\n')
        for n, name, was in sorted(review['well_known'], key=lambda t: t[1]):
            f.write(f"| {' '.join(NOTE[i] for i in ivals(n))} | {name} | {was} |\n")
        f.write(f"\n## Existing scales whose display name changes ({len(review['renamed'])})\n\n| page | was | now | rule |\n|---|---|---|---|\n")
        for n, was, now, how in review['renamed']:
            f.write(f'| {n} | {was} | {now} | {how} |\n')
        f.write(f"\n## Ids given to the copies that could not be reached ({len(review['moved_ids'])})\n\n| shared id | new id | name |\n|---|---|---|\n")
        for a, b, c in review['moved_ids']:
            f.write(f'| {a} | {b} | {c} |\n')
        f.write(f"\n## New scales ({len(review['new_ids'])})\n\n| page | id | name |\n|---|---|---|\n")
        for n, id_, name in review['new_ids']:
            f.write(f'| {n} | {id_} | {name} |\n')
        f.write(f"\n## Broken ids merged into the entry that holds their notes ({len(review['dropped_ids'])})\n\n")
        for a, b, c in review['dropped_ids']:
            f.write(f'- {a} ({b}) -> {c}\n')
        f.write(f"\n## New ids kept away from names code already uses ({len(review['dormant_avoided'])})\n\n")
        for a, b in review['dormant_avoided']:
            f.write(f'- {a}: {b}\n')
        f.write(f"\n## Ragas matched by name but placed by their sourced notes ({len(review['research_mismatch'])})\n\n")
        for n, name, note in review['research_mismatch'][:300]:
            f.write(f'- {n} {name}: {note}\n')
        f.write(f"\n## Ascent/descent text that could not be parsed ({len(review['parse_failed'])})\n\n")
        for s, name, text in review['parse_failed'][:200]:
            f.write(f'- {s} {name}: {text}\n')
    print('review sheet:', sheet)
    print('display names by rule:', dict(review['display_fallback']))
    print('entries', len(out), 'renamed', len(review['renamed']), 'moved ids', len(review['moved_ids']), 'new', len(review['new_ids']))
    print('ragas attached:', sum(len(r.get('ragas', [])) for r in out), 'with parsed paths:',
          sum(1 for r in out for g in r.get('ragas', []) if 'pu' in g and 'pd' in g))
    if write:
        with open(DATA, 'w', encoding='utf-8') as f:
            f.write('// Generated by tools/scales/build-catalog.py. Do not edit by hand.\n')
            f.write('// One entry per set of notes containing the root: 2,048. Names come from many sources and\n')
            f.write('// traditions; a name marked "u" is not confirmed for these notes. See the README for the rules.\n')
            f.write('window.EMBEDDED_SCALES_DATA = {"scales": [\n')
            f.write(',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in out))
            f.write('\n]};\n')
        print('wrote', DATA, os.path.getsize(DATA), 'bytes')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--pages', required=True)
    ap.add_argument('--research', required=True)
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    build(a.pages, a.research, a.write)
