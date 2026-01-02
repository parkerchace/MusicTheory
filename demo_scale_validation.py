#!/usr/bin/env python3
"""
Demo script to validate 20 random scales from the music theory engine.
This demonstrates the scale existence cleanup system with real internet searches.
"""

import sys
import random
import json
import re
from pathlib import Path
from typing import List, Dict, Any

# Add the scale-existence-cleanup src to path
sys.path.insert(0, str(Path(__file__).parent / 'scale-existence-cleanup' / 'src'))

try:
    from config import create_default_config
    from search_engine import MultiEngineSearchEngine
    from quality_checker import DocumentationQualityChecker
    from javascript_database_reader import JavaScriptDatabaseReader
    from models import ScaleData
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this from the workspace root directory")
    sys.exit(1)


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


def create_scale_data_objects(scales: List[Dict[str, Any]]) -> List[ScaleData]:
    """Convert scale dictionaries to ScaleData objects."""
    scale_objects = []
    
    for scale in scales:
        # Create a basic ScaleData object
        scale_data = ScaleData(
            name=scale['name'],
            intervals=scale['intervals'],
            description=f"{scale['display_name']} scale",
            cultural_context={
                'region': 'Unknown',
                'cultural_group': 'Unknown',
                'historical_period': 'Unknown',
                'musical_function': 'Unknown'
            },
            references=[]
        )
        scale_objects.append(scale_data)
    
    return scale_objects


def validate_scale(scale: ScaleData, search_engine: MultiEngineSearchEngine, 
                  quality_checker: DocumentationQualityChecker) -> Dict[str, Any]:
    """Validate a single scale by searching for it online."""
    print(f"\n🔍 Searching for: {scale.name} ({scale.name.replace('_', ' ').title()})")
    
    try:
        # Search for the scale
        search_results = search_engine.search_scale(scale.name)
        
        if not search_results:
            print(f"   ❌ No results found")
            return {
                'scale_name': scale.name,
                'display_name': scale.name.replace('_', ' ').title(),
                'intervals': scale.intervals,
                'found': False,
                'reason': 'No search results found',
                'quality_score': 0.0,
                'sources': [],
                'recommendation': 'REMOVE - No evidence of existence'
            }
        
        # Evaluate quality of sources
        quality_assessments = []
        valid_sources = []
        
        for result in search_results[:5]:  # Check top 5 results
            try:
                assessment = quality_checker.evaluate_source_quality(result.url, scale.name)
                quality_assessments.append(assessment)
                
                if assessment.overall_quality > 0.3:  # Minimum threshold
                    valid_sources.append({
                        'url': result.url,
                        'title': result.title,
                        'snippet': result.snippet[:150] + '...' if len(result.snippet) > 150 else result.snippet,
                        'quality_score': assessment.overall_quality,
                        'source_type': result.source_type.value,
                        'search_engine': result.search_engine
                    })
            except Exception as e:
                print(f"   ⚠️  Error evaluating source {result.url}: {e}")
                continue
        
        # Calculate overall quality
        if quality_assessments:
            avg_quality = sum(a.overall_quality for a in quality_assessments) / len(quality_assessments)
        else:
            avg_quality = 0.0
        
        # Make recommendation
        if not valid_sources:
            recommendation = "REMOVE - No valid sources found"
            found = False
            reason = "Sources found but none meet quality threshold"
        elif avg_quality < 0.4:
            recommendation = "REMOVE - Low quality sources only"
            found = False
            reason = f"Average quality {avg_quality:.2f} below threshold"
        elif len(valid_sources) < 2:
            recommendation = "REVIEW - Only one valid source"
            found = True
            reason = f"Found {len(valid_sources)} valid source(s)"
        else:
            recommendation = "KEEP - Multiple valid sources found"
            found = True
            reason = f"Found {len(valid_sources)} valid sources"
        
        print(f"   ✅ Found {len(search_results)} results, {len(valid_sources)} valid sources")
        print(f"   📊 Quality score: {avg_quality:.2f}")
        print(f"   💡 Recommendation: {recommendation}")
        
        return {
            'scale_name': scale.name,
            'display_name': scale.name.replace('_', ' ').title(),
            'intervals': scale.intervals,
            'found': found,
            'reason': reason,
            'quality_score': avg_quality,
            'sources': valid_sources,
            'recommendation': recommendation,
            'total_results': len(search_results)
        }
        
    except Exception as e:
        print(f"   ❌ Error during search: {e}")
        return {
            'scale_name': scale.name,
            'display_name': scale.name.replace('_', ' ').title(),
            'intervals': scale.intervals,
            'found': False,
            'reason': f'Search error: {str(e)}',
            'quality_score': 0.0,
            'sources': [],
            'recommendation': 'ERROR - Could not validate'
        }


def main():
    """Main demonstration function."""
    print("🎵 Scale Validation Demo - Testing 20 Random Scales")
    print("=" * 60)
    
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
    
    # Convert to ScaleData objects
    scale_objects = create_scale_data_objects(selected_scales)
    
    # Set up the validation system
    print("\n🔧 Setting up validation system...")
    try:
        config = create_default_config()
        
        # Configure for demo (reduce timeouts, enable DuckDuckGo only for free usage)
        for engine_config in config.search_engines:
            if engine_config.name == "duckduckgo":
                engine_config.enabled = True
                engine_config.timeout_seconds = 10
                engine_config.max_results_per_query = 5
            else:
                engine_config.enabled = False  # Disable paid APIs for demo
        
        search_engine = MultiEngineSearchEngine(config)
        quality_checker = DocumentationQualityChecker(config)
        
        print("✅ Validation system ready")
        
    except Exception as e:
        print(f"❌ Error setting up validation system: {e}")
        return 1
    
    # Validate each scale
    print("\n🔍 Starting validation process...")
    print("=" * 60)
    
    results = []
    for i, scale in enumerate(scale_objects, 1):
        print(f"\n[{i:2d}/{len(scale_objects)}]", end="")
        result = validate_scale(scale, search_engine, quality_checker)
        results.append(result)
        
        # Add a small delay to be respectful to search engines
        import time
        time.sleep(1)
    
    # Generate summary report
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)
    
    keep_count = len([r for r in results if r['recommendation'].startswith('KEEP')])
    review_count = len([r for r in results if r['recommendation'].startswith('REVIEW')])
    remove_count = len([r for r in results if r['recommendation'].startswith('REMOVE')])
    error_count = len([r for r in results if r['recommendation'].startswith('ERROR')])
    
    print(f"✅ KEEP:   {keep_count:2d} scales - Multiple valid sources found")
    print(f"⚠️  REVIEW: {review_count:2d} scales - Limited sources, needs manual review")
    print(f"❌ REMOVE: {remove_count:2d} scales - No valid sources or poor quality")
    print(f"🚫 ERROR:  {error_count:2d} scales - Could not validate due to errors")
    
    print(f"\nTotal scales processed: {len(results)}")
    
    # Show detailed results for scales recommended for removal
    if remove_count > 0:
        print(f"\n🗑️  SCALES RECOMMENDED FOR REMOVAL ({remove_count}):")
        print("-" * 50)
        for result in results:
            if result['recommendation'].startswith('REMOVE'):
                print(f"• {result['display_name']} ({result['scale_name']})")
                print(f"  Reason: {result['reason']}")
                print(f"  Quality Score: {result['quality_score']:.2f}")
                print()
    
    # Show scales that should be kept
    if keep_count > 0:
        print(f"\n✅ SCALES WITH GOOD DOCUMENTATION ({keep_count}):")
        print("-" * 50)
        for result in results:
            if result['recommendation'].startswith('KEEP'):
                print(f"• {result['display_name']} ({result['scale_name']})")
                print(f"  Quality Score: {result['quality_score']:.2f}")
                print(f"  Valid Sources: {len(result['sources'])}")
                if result['sources']:
                    print(f"  Best Source: {result['sources'][0]['title']}")
                print()
    
    # Save detailed results to JSON
    output_file = f"scale_validation_demo_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_scales': len(results),
                'keep_count': keep_count,
                'review_count': review_count,
                'remove_count': remove_count,
                'error_count': error_count,
                'timestamp': str(Path().cwd())
            },
            'results': results
        }, f, indent=2)
    
    print(f"💾 Detailed results saved to: {output_file}")
    
    print("\n🎵 Demo completed! This shows how the system:")
    print("   • Searches the internet for scale information")
    print("   • Evaluates source quality and relevance")
    print("   • Makes removal recommendations based on evidence")
    print("   • Distinguishes between real scales and questionable entries")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())