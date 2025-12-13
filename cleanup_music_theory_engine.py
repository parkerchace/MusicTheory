#!/usr/bin/env python3
"""
Clean up music-theory-engine.js to remove scales that were deleted during validation cleanup
"""

import json
import re

def load_validation_results():
    """Load the cleaned validation results."""
    with open('scale_validation_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def get_valid_scale_names():
    """Get the list of scale names that should remain in the engine."""
    data = load_validation_results()
    valid_scales = set()
    
    for scale in data['results']:
        if scale['recommendation'] in ['KEEP']:  # Only keep verified scales
            valid_scales.add(scale['scale_name'])
    
    return valid_scales

def cleanup_music_theory_engine():
    """Remove deleted scales from music-theory-engine.js."""
    
    print("🔍 Loading validation results...")
    valid_scales = get_valid_scale_names()
    print(f"✓ Found {len(valid_scales)} valid scales to keep")
    
    print("\n📖 Reading music-theory-engine.js...")
    with open('music-theory-engine.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all scale definitions in the intervals section
    intervals_pattern = r'(\w+):\s*\[[\d,\s]+\],'
    intervals_matches = re.findall(intervals_pattern, content)
    
    # Find all scale definitions in the scaleCitations section  
    citations_pattern = r'(\w+):\s*\{'
    citations_section = re.search(r'scaleCitations\s*=\s*\{(.*?)\n\s*\};', content, re.DOTALL)
    citations_matches = []
    if citations_section:
        citations_matches = re.findall(citations_pattern, citations_section.group(1))
    
    # Find all scales in categories
    categories_pattern = r"'([^']+)'(?=,|\])"
    categories_section = re.search(r'scaleCategories\s*=\s*\{(.*?)\n\s*\};', content, re.DOTALL)
    category_scales = []
    if categories_section:
        category_scales = re.findall(categories_pattern, categories_section.group(1))
    
    print(f"\n📊 Current scales in engine:")
    print(f"  Intervals section: {len(intervals_matches)} scales")
    print(f"  Citations section: {len(citations_matches)} scales") 
    print(f"  Categories section: {len(category_scales)} scales")
    
    # Find scales to remove
    all_engine_scales = set(intervals_matches + citations_matches + category_scales)
    scales_to_remove = all_engine_scales - valid_scales
    
    print(f"\n❌ Scales to remove: {len(scales_to_remove)}")
    for scale in sorted(scales_to_remove):
        print(f"  - {scale}")
    
    if not scales_to_remove:
        print("✅ No scales need to be removed!")
        return
    
    # Remove scales from intervals section
    print(f"\n🔧 Removing scales from intervals section...")
    for scale in scales_to_remove:
        pattern = rf'\s*{re.escape(scale)}:\s*\[[\d,\s]+\],?\n'
        content = re.sub(pattern, '', content)
    
    # Remove scales from scaleCitations section
    print(f"🔧 Removing scales from scaleCitations section...")
    for scale in scales_to_remove:
        # Match the entire scale citation block
        pattern = rf'\s*{re.escape(scale)}:\s*\{{[^}}]*\}},?\n'
        content = re.sub(pattern, '', content, flags=re.DOTALL)
        
        # Also handle multi-line scale citations
        pattern = rf'\s*{re.escape(scale)}:\s*\{{.*?\n\s*\}},?\n'
        content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # Remove scales from categories
    print(f"🔧 Removing scales from categories section...")
    for scale in scales_to_remove:
        # Remove from category arrays
        pattern = rf"'?{re.escape(scale)}'?,?\s*"
        content = re.sub(pattern, '', content)
        
        # Clean up any double commas or trailing commas
        content = re.sub(r',\s*,', ',', content)
        content = re.sub(r',\s*\]', ']', content)
    
    # Clean up any remaining formatting issues
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)  # Remove triple newlines
    content = re.sub(r',\s*\}', '\n            }', content)  # Fix trailing commas in objects
    
    print(f"\n💾 Saving cleaned music-theory-engine.js...")
    with open('music-theory-engine.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Verify the cleanup
    print(f"\n🔍 Verifying cleanup...")
    with open('music-theory-engine.js', 'r', encoding='utf-8') as f:
        new_content = f.read()
    
    remaining_scales = []
    for scale in scales_to_remove:
        if scale in new_content:
            remaining_scales.append(scale)
    
    if remaining_scales:
        print(f"⚠️  Warning: {len(remaining_scales)} scales still found in file:")
        for scale in remaining_scales:
            print(f"  - {scale}")
    else:
        print(f"✅ All {len(scales_to_remove)} scales successfully removed!")
    
    print(f"\n🎯 Cleanup complete!")
    print(f"  Removed: {len(scales_to_remove)} invalid scales")
    print(f"  Remaining: {len(valid_scales)} verified scales")

if __name__ == '__main__':
    cleanup_music_theory_engine()