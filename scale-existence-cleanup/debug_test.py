from src.javascript_database_reader import JavaScriptDatabaseReader
import tempfile

sample_js_content = """
class MusicTheoryEngine {
    constructor() {
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
            bebop_major: [0, 2, 4, 5, 7, 8, 9, 11]
        };
        
        this.scaleCitations = {
            major: {
                description: 'Ionian mode - fundamental to Western tonal music',
                culturalContext: {
                    region: "Western Europe",
                    culturalGroup: "European classical tradition"
                },
                references: [{
                    "type": "verified_source",
                    "title": "Major scale - Wikipedia"
                }]
            },
            raga_bhairav: {
                description: 'Indian classical raga',
                culturalContext: {
                    region: "India",
                    culturalGroup: "Indian classical tradition"
                },
                references: []
            }
        };
    }
}
"""

with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
    f.write(sample_js_content)
    temp_path = f.name

reader = JavaScriptDatabaseReader(temp_path)
stats = reader.get_database_statistics()
print('Statistics:', stats)

scales = reader.read_all_scales()
for scale in scales:
    print(f'Scale: {scale.name}, Type: {scale.scale_type}, Origin: {scale.cultural_origin}, Has refs: {bool(scale.metadata.get("references"))}')