from src.javascript_database_reader import JavaScriptDatabaseReader
import sys
from pathlib import Path

# Path to the actual music-theory-engine.js file
js_file_path = "../music-theory-engine.js"

try:
    reader = JavaScriptDatabaseReader(js_file_path)
    
    print("Testing JavaScript Database Reader with real data...")
    print("=" * 60)
    
    # Get statistics
    stats = reader.get_database_statistics()
    print(f"Total scales: {stats['total_scales']}")
    print(f"Scales by type: {stats['scales_by_type']}")
    print(f"Scales with citations: {stats['scales_with_citations']}")
    print(f"Scales without citations: {stats['scales_without_citations']}")
    print()
    
    # Show some example scales
    print("Sample scales:")
    print("-" * 30)
    
    scales = reader.read_all_scales()
    for i, scale in enumerate(scales[:10]):  # Show first 10 scales
        print(f"{i+1}. {scale.name}")
        print(f"   Type: {scale.scale_type.value}")
        print(f"   Origin: {scale.cultural_origin or 'Unknown'}")
        print(f"   Intervals: {scale.intervals}")
        print(f"   Notes (C root): {scale.notes}")
        print(f"   Has citations: {'Yes' if scale.metadata.get('references') else 'No'}")
        print()
    
    # Test specific scale types
    print("Cultural scales:")
    print("-" * 20)
    cultural_scales = reader.read_scales_by_type(reader.parser._determine_scale_type('raga_bhairav', None).__class__.CULTURAL)
    for scale in cultural_scales[:5]:  # Show first 5 cultural scales
        print(f"- {scale.name} ({scale.cultural_origin or 'Unknown origin'})")
    
    print(f"\nTotal cultural scales: {len(cultural_scales)}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

print("\nJavaScript Database Reader test completed successfully!")