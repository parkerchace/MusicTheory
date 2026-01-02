#!/usr/bin/env python3
"""
Concept demonstration of scale validation system.
Shows how the system would work with simulated search results.
"""

import random
import json
import re
from pathlib import Path
from typing import List, Dict, Any


def extract_scales_from_js_file(js_file_path: str) -> List[Dict[str, Any]]:
    """Extract scale definitions from the JavaScript music theory engine."""
    try:
        with open(js_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the scales object definition
        scales_match = re.search(r'this\.scales\s*=\s*\{(.*?)\};', content, re.DOTALL)
        if not scales_match:
            print("Could not find scales definition in JavaScript file")
            return []
        
        scales_content = scales_match.group(1)
        
        # Extract scale names and their interval patterns
        scale_pattern = r'(\w+):\s*\[([\d,\s]+)\]'
        matches = re.findall(scale_pattern, scales_content)
        
        scales = []
        for name, intervals_str in matches:
            intervals = [int(x.strip()) for x in intervals_str.split(',') if x.strip()]
            scales.append({
                'name': name,
                'intervals': intervals,
                'display_name': name.replace('_', ' ').title()
            })
        
        return scales
        
    except Exception as e:
        print(f"Error reading JavaScript file: {e}")
        return []


def simulate_search_results(scale_name: str, display_name: str) -> Dict[str, Any]:
    """
    Simulate what real internet search results would look like for different scales.
    This demonstrates the validation logic without making actual web requests.
    """
    
    # Well-documented scales that would have good search results
    well_documented_scales = {
        'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
        'harmonic', 'melodic', 'whole_tone', 'blues_minor_pentatonic', 'blues_major_pentatonic',
        'major_pentatonic', 'minor_pentatonic', 'hijaz', 'maqam_bayati', 'maqam_rast', 
        'raga_bhairav', 'spanish_phrygian', 'neapolitan_major', 'neapolitan_minor',
        'double_harmonic_major', 'altered', 'bebop_major', 'bebop_dominant'
    }
    
    # Scales with some documentation but limited sources
    moderately_documented_scales = {
        'prometheus', 'enigmatic', 'hungarian_minor', 'persian', 'flamenco',
        'octatonic_dim', 'octatonic_dom', 'augmented', 'tritone', 'hirajoshi',
        'iwato', 'insen', 'yo', 'maqam_ajam', 'maqam_nahawand', 'maqam_kurd'
    }
    
    # Regional/cultural scales that might have limited or questionable documentation
    questionable_scales = {
        'san_bushmen', 'dogon_traditional', 'bambara_traditional', 'senufo_traditional',
        'maasai_traditional', 'polka_paraguaya', 'tanzanian_taarab', 'algerian_chaabi',
        'berber_traditional', 'tuareg_pentatonic', 'moroccan_andalusi'
    }
    
    # Theoretical scales that exist in music theory but have limited practical use
    theoretical_scales = {
        'dorian_b2', 'dorian_b5', 'phrygian_b4', 'aeolian_b1', 'locrian_nat2',
        'locrian_nat6', 'lydian_augmented', 'lydian_dominant', 'mixolydian_b6',
        'ionian_augmented', 'dorian_sharp4', 'phrygian_dominant', 'lydian_sharp2'
    }
    
    if scale_name in well_documented_scales:
        return {
            'search_results': [
                {
                    'title': f'{display_name} Scale - Music Theory Guide',
                    'url': 'https://musictheory.net/lessons/scales',
                    'snippet': f'The {display_name} scale is a fundamental scale in music theory with specific intervals and characteristics...',
                    'source_type': 'educational'
                },
                {
                    'title': f'{display_name} - Wikipedia',
                    'url': f'https://en.wikipedia.org/wiki/{display_name}_scale',
                    'snippet': f'In music theory, the {display_name} scale is defined by its interval pattern and has been used throughout history...',
                    'source_type': 'educational'
                },
                {
                    'title': f'Understanding the {display_name} Scale',
                    'url': 'https://www.berklee.edu/scales',
                    'snippet': f'Learn about the {display_name} scale, its construction, and applications in various musical contexts...',
                    'source_type': 'academic'
                }
            ],
            'relevant_results': 3,
            'music_theory_results': 3,
            'quality_score': 0.85,
            'recommendation': 'KEEP',
            'reason': 'Multiple high-quality educational and academic sources found'
        }
    
    elif scale_name in moderately_documented_scales:
        return {
            'search_results': [
                {
                    'title': f'{display_name} Scale in Jazz Theory',
                    'url': 'https://jazzguitar.be/scales',
                    'snippet': f'The {display_name} scale is used in jazz and has specific harmonic applications...',
                    'source_type': 'educational'
                },
                {
                    'title': f'Exotic Scales: {display_name}',
                    'url': 'https://musictheorysite.com/exotic-scales',
                    'snippet': f'Among exotic scales, the {display_name} provides unique harmonic colors...',
                    'source_type': 'commercial'
                }
            ],
            'relevant_results': 2,
            'music_theory_results': 2,
            'quality_score': 0.65,
            'recommendation': 'KEEP',
            'reason': 'Found valid sources with music theory content'
        }
    
    elif scale_name in theoretical_scales:
        return {
            'search_results': [
                {
                    'title': f'Modes of Harmonic Minor: {display_name}',
                    'url': 'https://jazztheory.com/modes',
                    'snippet': f'The {display_name} is the second mode of the harmonic minor scale...',
                    'source_type': 'educational'
                }
            ],
            'relevant_results': 1,
            'music_theory_results': 1,
            'quality_score': 0.45,
            'recommendation': 'REVIEW',
            'reason': 'Limited sources found, theoretical scale with minimal practical documentation'
        }
    
    elif scale_name in questionable_scales:
        # Simulate finding general cultural information but no specific scale information
        cultural_group = scale_name.split('_')[0].title()
        return {
            'search_results': [
                {
                    'title': f'{cultural_group} People - Cultural Overview',
                    'url': f'https://en.wikipedia.org/wiki/{cultural_group}',
                    'snippet': f'The {cultural_group} people are known for their rich cultural traditions and music...',
                    'source_type': 'educational'
                },
                {
                    'title': f'{cultural_group} Music and Dance',
                    'url': 'https://worldmusic.org/cultures',
                    'snippet': f'Traditional {cultural_group} music features various instruments and vocal styles...',
                    'source_type': 'cultural'
                }
            ],
            'relevant_results': 0,  # No specific scale information
            'music_theory_results': 0,
            'quality_score': 0.15,
            'recommendation': 'REMOVE',
            'reason': f'Found cultural information about {cultural_group} people but no evidence of specific musical scale'
        }
    
    else:
        # Unknown or very obscure scales
        return {
            'search_results': [],
            'relevant_results': 0,
            'music_theory_results': 0,
            'quality_score': 0.0,
            'recommendation': 'REMOVE',
            'reason': 'No search results found for this scale'
        }


def validate_scale(scale: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a single scale using simulated search results."""
    scale_name = scale['name']
    display_name = scale['display_name']
    
    print(f"\n🔍 Validating: {display_name} ({scale_name})")
    
    # Get simulated search results
    search_data = simulate_search_results(scale_name, display_name)
    
    print(f"   📊 Found {len(search_data['search_results'])} total results, {search_data['relevant_results']} relevant")
    print(f"   🎵 Music theory results: {search_data['music_theory_results']}")
    print(f"   ⭐ Quality score: {search_data['quality_score']:.2f}")
    print(f"   💡 Recommendation: {search_data['recommendation']} - {search_data['reason']}")
    
    # Show best result if available
    if search_data['search_results']:
        best_result = search_data['search_results'][0]
        print(f"   🔗 Best source: {best_result['title'][:60]}...")
    
    return {
        'scale_name': scale_name,
        'display_name': display_name,
        'intervals': scale['intervals'],
        **search_data
    }


def main():
    """Main demonstration function."""
    print("🎵 Scale Validation Concept Demo - Testing 20 Random Scales")
    print("=" * 70)
    print("This demonstrates how the system would work with real internet searches")
    print("=" * 70)
    
    # Extract scales from the music theory engine
    js_file_path = "music-theory-engine.js"
    if not Path(js_file_path).exists():
        print(f"❌ Could not find {js_file_path}")
        print("Make sure you're running this from the workspace root directory")
        return 1
    
    print(f"📖 Reading scales from {js_file_path}...")
    scales_data = extract_scales_from_js_file(js_file_path)
    
    if not scales_data:
        print("❌ No scales found in the JavaScript file")
        return 1
    
    print(f"✅ Found {len(scales_data)} scales in the database")
    
    # Select 20 random scales
    random.seed(42)  # For reproducible results
    selected_scales = random.sample(scales_data, min(20, len(scales_data)))
    
    print(f"🎲 Selected {len(selected_scales)} random scales for validation:")
    for i, scale in enumerate(selected_scales, 1):
        print(f"   {i:2d}. {scale['display_name']} ({scale['name']})")
    
    print("\n🔍 Starting validation process...")
    print("=" * 70)
    
    results = []
    for i, scale in enumerate(selected_scales, 1):
        print(f"\n[{i:2d}/{len(selected_scales)}]", end="")
        result = validate_scale(scale)
        results.append(result)
    
    # Generate summary report
    print("\n" + "=" * 70)
    print("📊 VALIDATION SUMMARY")
    print("=" * 70)
    
    keep_count = len([r for r in results if r['recommendation'] == 'KEEP'])
    review_count = len([r for r in results if r['recommendation'] == 'REVIEW'])
    remove_count = len([r for r in results if r['recommendation'] == 'REMOVE'])
    
    print(f"✅ KEEP:   {keep_count:2d} scales - Multiple valid sources found")
    print(f"⚠️  REVIEW: {review_count:2d} scales - Limited sources, needs manual review")
    print(f"❌ REMOVE: {remove_count:2d} scales - No valid sources or poor quality")
    
    print(f"\nTotal scales processed: {len(results)}")
    
    # Show scales recommended for removal
    if remove_count > 0:
        print(f"\n🗑️  SCALES RECOMMENDED FOR REMOVAL ({remove_count}):")
        print("-" * 60)
        for result in results:
            if result['recommendation'] == 'REMOVE':
                print(f"• {result['display_name']} ({result['scale_name']})")
                print(f"  Reason: {result['reason']}")
                print(f"  Quality Score: {result['quality_score']:.2f}")
                print()
    
    # Show scales that should be kept
    if keep_count > 0:
        print(f"\n✅ SCALES WITH GOOD DOCUMENTATION ({keep_count}):")
        print("-" * 60)
        for result in results:
            if result['recommendation'] == 'KEEP':
                print(f"• {result['display_name']} ({result['scale_name']})")
                print(f"  Quality Score: {result['quality_score']:.2f}")
                print(f"  Relevant Sources: {result['relevant_results']}")
                if result['search_results']:
                    print(f"  Best Source: {result['search_results'][0]['title'][:50]}...")
                print()
    
    # Show scales that need review
    if review_count > 0:
        print(f"\n⚠️  SCALES NEEDING REVIEW ({review_count}):")
        print("-" * 60)
        for result in results:
            if result['recommendation'] == 'REVIEW':
                print(f"• {result['display_name']} ({result['scale_name']})")
                print(f"  Reason: {result['reason']}")
                print(f"  Quality Score: {result['quality_score']:.2f}")
                print()
    
    # Save detailed results to JSON
    output_file = f"scale_validation_concept_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_scales': len(results),
                'keep_count': keep_count,
                'review_count': review_count,
                'remove_count': remove_count,
                'validation_method': 'Simulated search results based on scale documentation patterns'
            },
            'results': results
        }, f, indent=2)
    
    print(f"💾 Detailed results saved to: {output_file}")
    
    print("\n🎵 This demonstrates the scale validation concept:")
    print("   • Well-documented scales (Major, Dorian, etc.) → KEEP")
    print("   • Theoretical scales with limited sources → REVIEW")
    print("   • Cultural names without scale evidence → REMOVE")
    print("   • Example: 'San Bushmen' people exist, but 'San Bushmen Scale' lacks evidence")
    print("   • The system distinguishes between cultural groups and actual musical scales")
    
    print(f"\n🔧 Your existing system in 'scale-existence-cleanup/' does this with real searches!")
    print("   • Uses Google, Bing, and DuckDuckGo APIs")
    print("   • Evaluates source quality and relevance")
    print("   • Creates backups before making changes")
    print("   • Generates detailed reports")
    
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())