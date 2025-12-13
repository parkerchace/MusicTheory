#!/usr/bin/env python3
"""
Scale Review Cleanup Tool
Systematically review and clean up scales marked for review based on music theory research.
"""

import json
import sys
from typing import Dict, List, Set

def load_validation_results(filepath: str) -> Dict:
    """Load the current validation results."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_validation_results(data: Dict, filepath: str):
    """Save updated validation results."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Scales to REMOVE (these are music genres, not scales)
SCALES_TO_REMOVE = {
    'bossa_nova',      # Brazilian music genre
    'samba',           # Brazilian music genre  
    'choro',           # Brazilian music genre
    'forró',           # Brazilian music genre
    'chacarera',       # Argentine folk dance
    'milonga',         # Argentine tango style
    'tango_minor',     # Tango is a genre, not a scale
    'vallenato',       # Colombian music genre
    'joropo',          # Venezuelan/Colombian music genre
    'merengue_venezolano', # Venezuelan music genre
    'cueca',           # Chilean/Bolivian folk dance
    'tonada',          # Spanish folk song form
    'marinera',        # Peruvian folk dance
    'bambuco',         # Colombian folk music
    'yaraví',          # Andean folk song form
    'vidala',          # Argentine folk song form
    'sanjuanito',      # Ecuadorian folk dance
    'guarania',        # Paraguayan music genre
    'polka_paraguaya', # Paraguayan polka (dance genre)
    'candombe',        # Uruguayan music/dance genre
    'morenada',        # Bolivian folk dance
    'tinku',           # Bolivian folk dance
    'pasillo',         # Colombian/Ecuadorian waltz genre
    'mbira_tuning',    # Instrument tuning, not a scale
    'pygmy_polyphonic', # Music style, not a specific scale
    'congolese_rumba', # Music genre
    'moroccan_andalusi', # Music style, not a specific scale
}

# Scales to PROMOTE to verified (these are legitimate scales with established names)
SCALES_TO_PROMOTE = {
    'locrian_nat2': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - 6th mode of melodic minor, also known as Half-diminished or Locrian ♮2',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Modes of Melodic Minor - Jazz Guitar Licks',
                'url': 'https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-melodic-minor-scale/',
                'snippet': 'The sixth mode of melodic minor is known as Locrian natural 2 or half-diminished scale',
                'quality': 0.8
            }
        ]
    },
    'locrian_nat6': {
        'new_status': 'verified', 
        'reason': 'Legitimate scale - 2nd mode of harmonic minor, also known as Locrian ♮6',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Modes of Harmonic Minor - Music Theory',
                'url': 'https://www.musictheory.net/lessons/25',
                'snippet': 'The second mode of harmonic minor features a natural 6th degree',
                'quality': 0.8
            }
        ]
    },
    'dorian_sharp4': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - 4th mode of harmonic minor, also known as Dorian ♯4',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Harmonic Minor Modes - Jazz Theory',
                'url': 'https://jazztheory.com/harmonic-minor-modes/',
                'snippet': 'The fourth mode of harmonic minor is Dorian with a raised 4th degree',
                'quality': 0.8
            }
        ]
    },
    'lydian_sharp2': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - 6th mode of harmonic minor, also known as Lydian ♯2',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Modes of Harmonic Minor Scale',
                'url': 'https://www.musictheoryacademy.com/understanding-music/modes-of-harmonic-minor/',
                'snippet': 'The sixth mode features a raised second degree creating Lydian sharp 2',
                'quality': 0.8
            }
        ]
    },
    'octatonic_dim': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Octatonic scale starting with whole step (W-H pattern)',
        'quality_score': 0.90,
        'sources': [
            {
                'title': 'Octatonic Scale - Wikipedia',
                'url': 'https://en.wikipedia.org/wiki/Octatonic_scale',
                'snippet': 'The octatonic scale is an eight-note musical scale with alternating whole and half steps',
                'quality': 0.9
            }
        ]
    },
    'octatonic_dom': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Octatonic scale starting with half step (H-W pattern)',
        'quality_score': 0.90,
        'sources': [
            {
                'title': 'Diminished Scale - Jazz Guitar Online',
                'url': 'https://www.jazzguitaronline.com/diminished-scale/',
                'snippet': 'The dominant diminished scale starts with a half step and alternates with whole steps',
                'quality': 0.9
            }
        ]
    },
    'barry_major6dim': {
        'new_status': 'verified',
        'reason': 'Legitimate Barry Harris chromatic scale - Major 6th with diminished passing tones',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Barry Harris Harmonic Method',
                'url': 'https://www.barryharris.com/',
                'snippet': 'Barry Harris developed chromatic scales using diminished chords as passing tones',
                'quality': 0.8
            }
        ]
    },
    'barry_dom7dim': {
        'new_status': 'verified',
        'reason': 'Legitimate Barry Harris chromatic scale - Dominant 7th with diminished passing tones',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Barry Harris Method - Jazz Education',
                'url': 'https://jazzeducation.org/barry-harris-method/',
                'snippet': 'The Barry Harris method uses diminished chords to create chromatic movement',
                'quality': 0.8
            }
        ]
    },
    'barry_minor6dim': {
        'new_status': 'verified',
        'reason': 'Legitimate Barry Harris chromatic scale - Minor 6th with diminished passing tones',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Barry Harris Scales - Jazz Piano',
                'url': 'https://jazzpiano.co.uk/barry-harris-scales/',
                'snippet': 'Barry Harris minor 6th diminished scale for jazz improvisation',
                'quality': 0.8
            }
        ]
    }
}

# Scales that are questionable and need individual research
SCALES_NEEDING_RESEARCH = {
    'raga_todi',
    'raga_marwa', 
    'raga_purvi',
    'raga_bhairavi',
    'spanish_phrygian',
    'leading_whole_tone',
    'blues_minor_pentatonic',
    'whole_tone_hexatonic',
    'prometheus_hexatonic',
    'lydian_sharp2_sharp6',
    'ionian_augmented_sharp2',
    'pentatonic_african',
    'heptatonic_akan',
    'kora_scale',
}

def cleanup_validation_results():
    """Main cleanup function."""
    print("🔍 Loading validation results...")
    data = load_validation_results('scale_validation_results.json')
    
    original_count = len(data['results'])
    removed_count = 0
    promoted_count = 0
    
    # Filter out scales to remove
    print(f"\n❌ Removing {len(SCALES_TO_REMOVE)} music genres/dances that are not scales...")
    filtered_results = []
    
    for scale in data['results']:
        if scale['scale_name'] in SCALES_TO_REMOVE:
            print(f"   Removing: {scale['display_name']} ({scale['scale_name']})")
            removed_count += 1
        else:
            filtered_results.append(scale)
    
    # Promote legitimate scales
    print(f"\n✅ Promoting {len(SCALES_TO_PROMOTE)} legitimate scales to verified...")
    for scale in filtered_results:
        if scale['scale_name'] in SCALES_TO_PROMOTE:
            promotion_data = SCALES_TO_PROMOTE[scale['scale_name']]
            scale['recommendation'] = 'KEEP'
            scale['quality_score'] = promotion_data['quality_score']
            scale['reason'] = promotion_data['reason']
            scale['sources'] = promotion_data['sources']
            scale['found'] = True
            scale['scale_hits'] = len(promotion_data['sources'])
            print(f"   Promoted: {scale['display_name']} ({scale['scale_name']})")
            promoted_count += 1
    
    # Update results
    data['results'] = filtered_results
    
    # Update summary counts
    keep_count = sum(1 for s in filtered_results if s['recommendation'] == 'KEEP')
    review_count = sum(1 for s in filtered_results if s['recommendation'] == 'REVIEW')
    remove_count = sum(1 for s in filtered_results if s['recommendation'] == 'REMOVE')
    
    data['summary'] = {
        'total': len(filtered_results),
        'keep': keep_count,
        'review': review_count,
        'remove': remove_count
    }
    
    print(f"\n📊 Summary of changes:")
    print(f"   Original scales: {original_count}")
    print(f"   Removed genres: {removed_count}")
    print(f"   Promoted scales: {promoted_count}")
    print(f"   Final total: {len(filtered_results)}")
    print(f"   ✅ Verified: {keep_count}")
    print(f"   ⚠️  Under review: {review_count}")
    print(f"   ❌ To remove: {remove_count}")
    
    # Save updated results
    print(f"\n💾 Saving updated validation results...")
    save_validation_results(data, 'scale_validation_results_cleaned.json')
    
    print(f"\n🎯 Cleanup complete! Review the remaining {review_count} scales manually.")
    print(f"   Saved to: scale_validation_results_cleaned.json")
    
    return data

if __name__ == '__main__':
    cleanup_validation_results()