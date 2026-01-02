#!/usr/bin/env python3
"""
Safely clean up music-theory-engine.js by removing invalid scales while preserving syntax
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
        if scale['recommendation'] in ['KEEP']:
            valid_scales.add(scale['scale_name'])
    
    return valid_scales

def safe_cleanup_engine():
    """Safely remove invalid scales from music-theory-engine.js."""
    
    print("🔍 Loading validation results...")
    valid_scales = get_valid_scale_names()
    print(f"✓ Found {len(valid_scales)} valid scales to keep")
    
    print("\n📖 Reading music-theory-engine.js...")
    with open('music-theory-engine.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find scales in the intervals object (this.scales = {...})
    scales_pattern = r'(this\.scales\s*=\s*\{)(.*?)(\n\s*\};)'
    scales_match = re.search(scales_pattern, content, re.DOTALL)
    
    if not scales_match:
        print("❌ Could not find scales object in music-theory-engine.js")
        return
    
    scales_content = scales_match.group(2)
    
    # Find individual scale definitions
    scale_definitions = re.findall(r'(\w+):\s*\[[^\]]+\],?', scales_content)
    
    print(f"\n📊 Found {len(scale_definitions)} scales in intervals object")
    
    # Find scales to remove
    scales_to_remove = set(scale_definitions) - valid_scales
    print(f"❌ Scales to remove from intervals: {len(scales_to_remove)}")
    
    # Remove invalid scales from intervals object
    for scale in scales_to_remove:
        pattern = rf'\s*{re.escape(scale)}:\s*\[[^\]]+\],?\n?'
        scales_content = re.sub(pattern, '', scales_content)
        print(f"  - Removed {scale} from intervals")
    
    # Rebuild the scales object
    new_scales_section = scales_match.group(1) + scales_content + scales_match.group(3)
    content = content[:scales_match.start()] + new_scales_section + content[scales_match.end():]
    
    # Remove invalid scales from scaleCitations object
    print(f"\n🔧 Removing scales from scaleCitations...")
    citations_pattern = r'(scaleCitations\s*=\s*\{)(.*?)(\n\s*\};)'
    citations_match = re.search(citations_pattern, content, re.DOTALL)
    
    if citations_match:
        citations_content = citations_match.group(2)
        
        # Find citation scale names
        citation_scales = re.findall(r'(\w+):\s*\{', citations_content)
        citation_scales_to_remove = set(citation_scales) - valid_scales
        
        print(f"❌ Scales to remove from citations: {len(citation_scales_to_remove)}")
        
        for scale in citation_scales_to_remove:
            # Remove entire citation block for this scale
            pattern = rf'\s*{re.escape(scale)}:\s*\{{[^}}]*(?:\{{[^}}]*\}}[^}}]*)*\}},?\n?'
            citations_content = re.sub(pattern, '', citations_content, flags=re.DOTALL)
            print(f"  - Removed {scale} from citations")
        
        # Rebuild citations object
        new_citations_section = citations_match.group(1) + citations_content + citations_match.group(3)
        content = content[:citations_match.start()] + new_citations_section + content[citations_match.end():]
    
    # Remove scales from categories
    print(f"\n🔧 Removing scales from categories...")
    categories_pattern = r'(scaleCategories\s*=\s*\{)(.*?)(\n\s*\};)'
    categories_match = re.search(categories_pattern, content, re.DOTALL)
    
    if categories_match:
        categories_content = categories_match.group(2)
        
        # Remove invalid scale names from arrays
        for scale in scales_to_remove.union(citation_scales_to_remove if 'citation_scales_to_remove' in locals() else set()):
            # Remove scale from category arrays
            pattern = rf"'?{re.escape(scale)}'?,?\s*"
            categories_content = re.sub(pattern, '', categories_content)
        
        # Clean up formatting
        categories_content = re.sub(r',\s*,', ',', categories_content)  # Remove double commas
        categories_content = re.sub(r',\s*\]', ']', categories_content)  # Remove trailing commas
        
        # Rebuild categories object
        new_categories_section = categories_match.group(1) + categories_content + categories_match.group(3)
        content = content[:categories_match.start()] + new_categories_section + content[categories_match.end():]
    
    print(f"\n💾 Saving cleaned music-theory-engine.js...")
    with open('music-theory-engine.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✅ Safe cleanup completed!")
    print(f"  Kept: {len(valid_scales)} verified scales")
    print(f"  Removed: {len(scales_to_remove)} + {len(citation_scales_to_remove) if 'citation_scales_to_remove' in locals() else 0} invalid scales")

if __name__ == '__main__':
    safe_cleanup_engine()