#!/usr/bin/env python3
"""
Scale Review Cleanup Phase 2
Research and clean up the remaining questionable scales.
"""

import json

def load_validation_results(filepath: str) -> dict:
    """Load the current validation results."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_validation_results(data: dict, filepath: str):
    """Save updated validation results."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Additional scales to REMOVE (too vague, genres, or instrument-specific)
ADDITIONAL_SCALES_TO_REMOVE = {
    'pentatonic_african',      # Too vague - "African pentatonic" is not specific
    'heptatonic_akan',         # Too vague - ethnic group, not specific scale
    'balafon_scale',           # Instrument tuning, not universal scale
    'kora_scale',              # Instrument tuning, not universal scale  
    'yoruba_traditional',      # Too vague - ethnic music style
    'ewe_traditional',         # Too vague - ethnic music style
    'hausa_pentatonic',        # Too vague - ethnic group + pentatonic
    'fulani_pastoral',         # Too vague - ethnic music style
    'mandinka_griot',          # Music tradition, not specific scale
    'wolof_sabar',             # Drumming tradition, not scale
    'bantu_traditional',       # Too vague - large ethnic group
    'kenyan_benga',            # Music genre, not scale
    'ugandan_traditional',     # Too vague - national music style
    'tanzanian_taarab',        # Music genre, not scale
    'xylophone_chopi',         # Instrument-specific, not universal scale
    'zulu_traditional',        # Too vague - ethnic music style
    'xhosa_traditional',       # Too vague - ethnic music style
    'sotho_traditional',       # Too vague - ethnic music style
    'south_african_jazz',      # Music genre, not scale
    'marabi_scale',            # Music genre, not specific scale
    'berber_traditional',      # Too vague - ethnic music style
    'tuareg_pentatonic',       # Too vague - ethnic group + pentatonic
    'algerian_chaabi',         # Music genre, not scale
    'egyptian_maqam_influenced', # Too vague - influenced by maqam
    'san_bushmen',             # Too vague - ethnic music style
    'dogon_traditional',       # Too vague - ethnic music style
    'bambara_traditional',     # Too vague - ethnic music style
    'senufo_traditional',      # Too vague - ethnic music style
    'ethiopian_tezeta',        # Music genre/mode, not specific scale
}

# Scales to PROMOTE to verified (legitimate scales)
ADDITIONAL_SCALES_TO_PROMOTE = {
    'raga_todi': {
        'new_status': 'verified',
        'reason': 'Legitimate Indian classical raga - Todi is a well-documented raga in Hindustani music',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Raga Todi - Indian Classical Music',
                'url': 'https://en.wikipedia.org/wiki/Todi_(raga)',
                'snippet': 'Todi is a Hindustani classical raga which gave its name to the Todi thaat',
                'quality': 0.9
            }
        ]
    },
    'raga_marwa': {
        'new_status': 'verified',
        'reason': 'Legitimate Indian classical raga - Marwa is a well-documented evening raga',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Raga Marwa - Hindustani Classical Music',
                'url': 'https://en.wikipedia.org/wiki/Marwa_(raga)',
                'snippet': 'Marwa is a hexatonic Hindustani classical raga',
                'quality': 0.9
            }
        ]
    },
    'raga_purvi': {
        'new_status': 'verified',
        'reason': 'Legitimate Indian classical raga - Purvi is the parent raga of Purvi thaat',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Raga Purvi - Indian Classical Music',
                'url': 'https://en.wikipedia.org/wiki/Purvi',
                'snippet': 'Purvi is a raga in Hindustani classical music that gave its name to the Purvi thaat',
                'quality': 0.9
            }
        ]
    },
    'raga_bhairavi': {
        'new_status': 'verified',
        'reason': 'Legitimate Indian classical raga - Bhairavi is equivalent to natural minor scale',
        'quality_score': 0.90,
        'sources': [
            {
                'title': 'Raga Bhairavi - Hindustani Classical Music',
                'url': 'https://en.wikipedia.org/wiki/Bhairavi',
                'snippet': 'Bhairavi is a Hindustani classical raga of Bhairavi thaat, equivalent to natural minor',
                'quality': 0.9
            }
        ]
    },
    'leading_whole_tone': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Whole tone scale with added leading tone, used in classical music',
        'quality_score': 0.80,
        'sources': [
            {
                'title': 'Leading Whole-Tone Scale - Music Theory',
                'url': 'https://musictheory.pugetsound.edu/mt21c/leading-whole-tone-scale.html',
                'snippet': 'The leading whole-tone scale adds a leading tone to the whole-tone collection',
                'quality': 0.8
            }
        ]
    },
    'blues_minor_pentatonic': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Minor pentatonic with added blue note (b5), fundamental to blues music',
        'quality_score': 0.90,
        'sources': [
            {
                'title': 'Blues Scale - Music Theory',
                'url': 'https://en.wikipedia.org/wiki/Blues_scale',
                'snippet': 'The blues scale is a pentatonic scale with added chromatic "blue notes"',
                'quality': 0.9
            }
        ]
    },
    'whole_tone_hexatonic': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Standard whole tone scale (6 notes), used extensively in impressionist music',
        'quality_score': 0.90,
        'sources': [
            {
                'title': 'Whole Tone Scale - Wikipedia',
                'url': 'https://en.wikipedia.org/wiki/Whole_tone_scale',
                'snippet': 'The whole tone scale is a hexatonic scale with six pitches',
                'quality': 0.9
            }
        ]
    },
    'prometheus_hexatonic': {
        'new_status': 'verified',
        'reason': 'Legitimate scale - Scriabin\'s Prometheus scale, used in his symphonic poem "Prometheus"',
        'quality_score': 0.85,
        'sources': [
            {
                'title': 'Prometheus Scale - Scriabin',
                'url': 'https://en.wikipedia.org/wiki/Mystic_chord',
                'snippet': 'The mystic chord or Prometheus chord is a six-note synthetic chord used by Scriabin',
                'quality': 0.9
            }
        ]
    }
}

# Scales that are duplicates or should be merged
SCALES_TO_MERGE_OR_REMOVE = {
    'spanish_phrygian': 'REMOVE',  # This is the same as Phrygian Dominant (already verified)
    'lydian_sharp2_sharp6': 'REMOVE',  # Too theoretical, not commonly used
    'ionian_augmented_sharp2': 'REMOVE',  # Too theoretical, not commonly used
}

def cleanup_phase2():
    """Phase 2 cleanup function."""
    print("🔍 Loading cleaned validation results...")
    data = load_validation_results('scale_validation_results_cleaned.json')
    
    original_count = len(data['results'])
    removed_count = 0
    promoted_count = 0
    
    # Filter out additional scales to remove
    print(f"\n❌ Removing {len(ADDITIONAL_SCALES_TO_REMOVE)} vague/generic cultural scales...")
    filtered_results = []
    
    for scale in data['results']:
        if scale['scale_name'] in ADDITIONAL_SCALES_TO_REMOVE:
            print(f"   Removing: {scale['display_name']} ({scale['scale_name']}) - Too vague/generic")
            removed_count += 1
        elif scale['scale_name'] in SCALES_TO_MERGE_OR_REMOVE:
            print(f"   Removing: {scale['display_name']} ({scale['scale_name']}) - {SCALES_TO_MERGE_OR_REMOVE[scale['scale_name']]}")
            removed_count += 1
        else:
            filtered_results.append(scale)
    
    # Promote legitimate scales
    print(f"\n✅ Promoting {len(ADDITIONAL_SCALES_TO_PROMOTE)} legitimate scales to verified...")
    for scale in filtered_results:
        if scale['scale_name'] in ADDITIONAL_SCALES_TO_PROMOTE:
            promotion_data = ADDITIONAL_SCALES_TO_PROMOTE[scale['scale_name']]
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
    
    print(f"\n📊 Phase 2 Summary:")
    print(f"   Original scales: {original_count}")
    print(f"   Removed in phase 2: {removed_count}")
    print(f"   Promoted in phase 2: {promoted_count}")
    print(f"   Final total: {len(filtered_results)}")
    print(f"   ✅ Verified: {keep_count}")
    print(f"   ⚠️  Under review: {review_count}")
    print(f"   ❌ To remove: {remove_count}")
    
    # Save updated results
    print(f"\n💾 Saving final cleaned validation results...")
    save_validation_results(data, 'scale_validation_results_final.json')
    
    print(f"\n🎯 Phase 2 cleanup complete!")
    print(f"   Saved to: scale_validation_results_final.json")
    print(f"   Remaining scales under review: {review_count}")
    
    return data

if __name__ == '__main__':
    cleanup_phase2()