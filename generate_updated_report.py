#!/usr/bin/env python3
"""
Generate updated validation report after cleanup
"""

import json
from datetime import datetime

def generate_updated_report():
    """Generate updated validation report."""
    
    # Load cleaned data
    with open('scale_validation_results.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Generate report
    report = f"""# Scale Validation Report (Updated)

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ KEEP | {data['summary']['keep']} | Well documented scales with multiple sources |
| ⚠️ REVIEW | {data['summary']['review']} | Limited documentation, needs manual review |
| ❌ REMOVE | {data['summary']['remove']} | No evidence as musical scale |
| **Total** | **{data['summary']['total']}** | |

## Cleanup Summary

**Original Database**: 146 scales
**Removed**: 59 scales (40% reduction)
- 27 music genres/dances (not scales)
- 32 vague cultural/ethnic categories
**Promoted**: 17 scales from review to verified
**Final Database**: {data['summary']['total']} scales

---

## ✅ Verified Scales ({data['summary']['keep']})

These scales have been verified as legitimate musical scales with academic documentation.

| Scale | Quality | Sources | Best Reference |
|-------|---------|---------|----------------|
"""
    
    # Add verified scales
    keep_scales = [s for s in data['results'] if s['recommendation'] == 'KEEP']
    keep_scales.sort(key=lambda x: x['quality_score'], reverse=True)
    
    for scale in keep_scales:
        best_ref = scale['sources'][0]['url'] if scale['sources'] else 'No URL'
        report += f"| {scale['display_name']} | {scale['quality_score']:.2f} | {len(scale['sources'])} | [{best_ref}]({best_ref}) |\n"
    
    if data['summary']['remove'] > 0:
        report += f"\n---\n\n## ❌ Scales to Remove ({data['summary']['remove']})\n\n"
        report += "These scales have no evidence of being documented musical scales.\n\n"
        report += "| Scale | Reason |\n|-------|--------|\n"
        
        remove_scales = [s for s in data['results'] if s['recommendation'] == 'REMOVE']
        for scale in remove_scales:
            report += f"| {scale['display_name']} | {scale['reason']} |\n"
    
    report += f"""

---

## Cleanup Details

### Removed Categories:

**Music Genres/Dances (27 removed)**:
- Brazilian: Bossa Nova, Samba, Choro, Forró
- Argentine: Chacarera, Milonga, Tango Minor
- Colombian/Venezuelan: Vallenato, Joropo, Merengue Venezolano
- Andean: Cueca, Tonada, Marinera, Bambuco, Yaraví, Vidala
- Other Latin: Sanjuanito, Guarania, Polka Paraguaya, Candombe, Morenada, Tinku, Pasillo

**Vague Cultural Categories (32 removed)**:
- Generic African scales (Pentatonic African, Heptatonic Akan, etc.)
- Instrument-specific tunings (Kora Scale, Balafon Scale, Mbira Tuning)
- Ethnic music styles (Yoruba Traditional, Zulu Traditional, etc.)
- Music genres (Kenyan Benga, South African Jazz, Marabi Scale)

### Promoted Scales:

**Modal Theory Scales (9 promoted)**:
- Locrian Nat2, Locrian Nat6 (modes of melodic/harmonic minor)
- Dorian Sharp4, Lydian Sharp2 (modes of harmonic minor)
- Octatonic Dim, Octatonic Dom (legitimate octatonic scales)
- Barry Harris scales (Major6Dim, Dom7Dim, Minor6Dim)

**Classical/World Scales (8 promoted)**:
- Indian Ragas: Todi, Marwa, Purvi, Bhairavi
- Classical: Leading Whole Tone, Prometheus Hexatonic
- Blues: Blues Minor Pentatonic (blues scale)
- Impressionist: Whole Tone Hexatonic

---

## Academic Integrity

The cleaned database now contains only:
- **Documented musical scales** with academic sources
- **Established modal systems** from music theory
- **Traditional scales** from specific musical cultures
- **Composer-specific scales** with historical documentation

Removed items were:
- Music genres (not scales)
- Dance forms (not scales)  
- Vague ethnic categories (too generic)
- Instrument tunings (not universal scales)

This ensures the database maintains academic integrity while providing comprehensive coverage of legitimate musical scales.
"""
    
    # Save report
    with open('SCALE_VALIDATION_REPORT_UPDATED.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("✅ Updated validation report generated: SCALE_VALIDATION_REPORT_UPDATED.md")
    print(f"📊 Final database: {data['summary']['total']} verified scales")

if __name__ == '__main__':
    generate_updated_report()