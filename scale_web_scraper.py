#!/usr/bin/env python3
"""
Scale Web Scraper - Validates musical scales by searching the internet.
Uses DuckDuckGo to find real information about scale degrees, culture, and context.
Removes scales that don't have legitimate documentation as musical scales.

Usage:
    python scale_web_scraper.py                    # Validate ALL scales
    python scale_web_scraper.py --sample 20        # Validate 20 random scales
    python scale_web_scraper.py --search "lydian"  # Search for a specific scale
    python scale_web_scraper.py --list             # List all scales in database
"""

import argparse
import random
import json
import re
import time
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from ddgs import DDGS


def extract_scales_from_js(js_file: str) -> List[Dict[str, Any]]:
    """Extract scale definitions from the JavaScript music theory engine."""
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'this\.scales\s*=\s*\{(.*?)\};', content, re.DOTALL)
    if not match:
        return []
    
    scales = []
    for name, intervals in re.findall(r'(\w+):\s*\[([\d,\s]+)\]', match.group(1)):
        intervals_list = [int(x.strip()) for x in intervals.split(',') if x.strip()]
        scales.append({
            'name': name,
            'intervals': intervals_list,
            'display_name': name.replace('_', ' ').title()
        })
    
    return scales


def search_scale(scale_name: str, display_name: str) -> List[Dict]:
    """Search for a scale and return results."""
    queries = [
        f'"{display_name} scale" music theory intervals',
        f'{display_name} musical scale notes',
    ]
    
    all_results = []
    ddgs = DDGS()
    
    for query in queries:
        try:
            results = list(ddgs.text(query, max_results=5))
            all_results.extend(results)
            time.sleep(2)  # Longer delay between queries
        except Exception as e:
            print(f"      Search error: {e}")
            time.sleep(3)  # Extra delay on error
            continue
    
    seen = set()
    unique = []
    for r in all_results:
        url = r.get('href', '').lower()
        if url and url not in seen:
            seen.add(url)
            unique.append(r)
    
    return unique


def evaluate_results(results: List[Dict], scale_name: str, display_name: str) -> Dict[str, Any]:
    """Evaluate if search results indicate a real musical scale."""
    
    if not results:
        return {
            'found': False,
            'quality_score': 0.0,
            'music_hits': 0,
            'scale_hits': 0,
            'recommendation': 'REMOVE',
            'reason': 'No search results found',
            'sources': []
        }
    
    music_keywords = ['scale', 'mode', 'interval', 'note', 'degree', 'semitone', 
                      'music theory', 'chord', 'harmony', 'melody', 'key', 'pitch',
                      'octave', 'tonic', 'dominant']
    
    scale_lower = scale_name.lower().replace('_', ' ')
    display_lower = display_name.lower()
    
    music_hits = 0
    scale_hits = 0
    sources = []
    
    for result in results:
        title = result.get('title', '').lower()
        body = result.get('body', '').lower()
        url = result.get('href', '').lower()
        content = f"{title} {body}"
        
        has_scale_word = 'scale' in content or 'mode' in content
        has_name = scale_lower in content or display_lower in content
        music_count = sum(1 for kw in music_keywords if kw in content)
        
        if music_count >= 2:
            music_hits += 1
            
            if has_scale_word and has_name:
                scale_hits += 1
                
                quality = 0.5
                if '.edu' in url or 'wikipedia' in url:
                    quality = 0.9
                elif 'musictheory' in url or 'jazz' in url:
                    quality = 0.7
                
                sources.append({
                    'title': result.get('title', '')[:80],
                    'url': result.get('href', ''),
                    'snippet': result.get('body', '')[:150],
                    'quality': quality
                })
    
    if scale_hits >= 2:
        quality_score = min(0.9, 0.4 + (scale_hits * 0.15))
        recommendation = 'KEEP'
        reason = f'Found {scale_hits} sources with scale documentation'
    elif scale_hits == 1:
        quality_score = 0.45
        recommendation = 'REVIEW'
        reason = 'Only one source with scale info'
    elif music_hits >= 1:
        quality_score = 0.3
        recommendation = 'REVIEW'
        reason = 'Music content found but no specific scale docs'
    else:
        quality_score = 0.0
        recommendation = 'REMOVE'
        reason = 'No music theory content found'
    
    return {
        'found': scale_hits > 0,
        'quality_score': quality_score,
        'music_hits': music_hits,
        'scale_hits': scale_hits,
        'recommendation': recommendation,
        'reason': reason,
        'sources': sources[:3]
    }


def validate_scale(scale: Dict[str, Any], verbose: bool = True) -> Dict[str, Any]:
    """Validate a single scale."""
    name = scale['name']
    display = scale['display_name']
    
    if verbose:
        print(f"\n🔍 {display} ({name})")
    
    results = search_scale(name, display)
    evaluation = evaluate_results(results, name, display)
    
    if verbose:
        icon = '✅' if evaluation['recommendation'] == 'KEEP' else ('⚠️' if evaluation['recommendation'] == 'REVIEW' else '❌')
        print(f"   {icon} {evaluation['recommendation']}: {evaluation['reason']}")
        print(f"   📊 Quality: {evaluation['quality_score']:.2f} | Scale hits: {evaluation['scale_hits']} | Music hits: {evaluation['music_hits']}")
        
        if evaluation['sources']:
            print(f"   🔗 Best: {evaluation['sources'][0]['title'][:60]}...")
    
    return {
        'scale_name': name,
        'display_name': display,
        'intervals': scale['intervals'],
        'total_results': len(results),
        **evaluation
    }


def generate_markdown_report(results: List[Dict], output_file: str):
    """Generate a comprehensive markdown report."""
    
    keep = [r for r in results if r['recommendation'] == 'KEEP']
    review = [r for r in results if r['recommendation'] == 'REVIEW']
    remove = [r for r in results if r['recommendation'] == 'REMOVE']
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    md = f"""# Scale Validation Report

Generated: {timestamp}

## Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ KEEP | {len(keep)} | Well documented scales with multiple sources |
| ⚠️ REVIEW | {len(review)} | Limited documentation, needs manual review |
| ❌ REMOVE | {len(remove)} | No evidence as musical scale |
| **Total** | **{len(results)}** | |

---

## ✅ Validated Scales ({len(keep)})

These scales have multiple sources confirming their existence as documented musical scales.

| Scale | Quality | Sources | Best Reference |
|-------|---------|---------|----------------|
"""
    
    for r in sorted(keep, key=lambda x: x['quality_score'], reverse=True):
        best_url = r['sources'][0]['url'][:50] + '...' if r['sources'] else 'N/A'
        md += f"| {r['display_name']} | {r['quality_score']:.2f} | {r['scale_hits']} | [{best_url}]({r['sources'][0]['url'] if r['sources'] else '#'}) |\n"
    
    md += f"""
---

## ⚠️ Scales Needing Review ({len(review)})

These scales have some music content but lack specific scale documentation.

| Scale | Quality | Reason | Music Hits |
|-------|---------|--------|------------|
"""
    
    for r in sorted(review, key=lambda x: x['quality_score'], reverse=True):
        md += f"| {r['display_name']} | {r['quality_score']:.2f} | {r['reason']} | {r['music_hits']} |\n"
    
    md += f"""
---

## ❌ Scales to Remove ({len(remove)})

These scales have no evidence of being documented musical scales.

| Scale | Reason |
|-------|--------|
"""
    
    for r in remove:
        md += f"| {r['display_name']} | {r['reason']} |\n"
    
    md += """
---

## Detailed Results

"""
    
    for r in results:
        icon = '✅' if r['recommendation'] == 'KEEP' else ('⚠️' if r['recommendation'] == 'REVIEW' else '❌')
        md += f"""### {icon} {r['display_name']}

- **Internal Name:** `{r['scale_name']}`
- **Intervals:** {r['intervals']}
- **Recommendation:** {r['recommendation']}
- **Quality Score:** {r['quality_score']:.2f}
- **Reason:** {r['reason']}

"""
        if r['sources']:
            md += "**Sources:**\n"
            for s in r['sources']:
                md += f"- [{s['title']}]({s['url']})\n"
        md += "\n---\n\n"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"📝 Markdown report saved to: {output_file}")


def search_single_scale(scale_name: str):
    """Search for a single scale by name."""
    print(f"🔍 Searching for: {scale_name}")
    
    ddgs = DDGS()
    queries = [
        f'"{scale_name} scale" music theory intervals',
        f'{scale_name} musical scale notes degrees',
    ]
    
    all_results = []
    for query in queries:
        try:
            results = list(ddgs.text(query, max_results=10))
            all_results.extend(results)
            time.sleep(1)
        except Exception as e:
            print(f"Search error: {e}")
    
    if not all_results:
        print("❌ No results found")
        return
    
    print(f"\n📊 Found {len(all_results)} results:\n")
    
    seen = set()
    for i, r in enumerate(all_results, 1):
        url = r.get('href', '')
        if url in seen:
            continue
        seen.add(url)
        
        title = r.get('title', 'No title')
        body = r.get('body', '')[:200]
        
        # Check relevance
        content = (title + ' ' + body).lower()
        has_scale = 'scale' in content or 'mode' in content
        has_music = any(kw in content for kw in ['music', 'note', 'interval', 'chord'])
        
        if has_scale and has_music:
            print(f"✅ {i}. {title}")
        elif has_music:
            print(f"⚠️ {i}. {title}")
        else:
            print(f"❌ {i}. {title}")
        
        print(f"   URL: {url}")
        print(f"   {body}...")
        print()


def main():
    parser = argparse.ArgumentParser(description='Scale Web Scraper - Validate musical scales')
    parser.add_argument('--sample', type=int, help='Validate N random scales')
    parser.add_argument('--search', type=str, help='Search for a specific scale')
    parser.add_argument('--list', action='store_true', help='List all scales in database')
    parser.add_argument('--js-file', default='music-theory-engine.js', help='Path to JS file')
    args = parser.parse_args()
    
    # Handle search mode
    if args.search:
        search_single_scale(args.search)
        return 0
    
    # Load scales
    if not Path(args.js_file).exists():
        print(f"❌ Cannot find {args.js_file}")
        return 1
    
    scales = extract_scales_from_js(args.js_file)
    print(f"📖 Found {len(scales)} scales in database")
    
    # Handle list mode
    if args.list:
        print("\nAll scales in database:")
        for i, s in enumerate(scales, 1):
            print(f"  {i:3d}. {s['display_name']} ({s['name']})")
        return 0
    
    # Determine which scales to process
    if args.sample:
        random.seed(42)
        scales_to_process = random.sample(scales, min(args.sample, len(scales)))
        print(f"🎲 Testing {len(scales_to_process)} random scales")
    else:
        scales_to_process = scales
        print(f"🎵 Validating ALL {len(scales_to_process)} scales (this will take a while...)")
    
    print("\n" + "=" * 70)
    print("🔍 Starting web validation...")
    
    results = []
    for i, scale in enumerate(scales_to_process, 1):
        print(f"\n[{i}/{len(scales_to_process)}]", end="")
        result = validate_scale(scale)
        results.append(result)
        time.sleep(3)  # Rate limiting - 3 seconds between scales
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    
    keep = [r for r in results if r['recommendation'] == 'KEEP']
    review = [r for r in results if r['recommendation'] == 'REVIEW']
    remove = [r for r in results if r['recommendation'] == 'REMOVE']
    
    print(f"✅ KEEP:   {len(keep):3d} - Well documented scales")
    print(f"⚠️  REVIEW: {len(review):3d} - Limited documentation")
    print(f"❌ REMOVE: {len(remove):3d} - No evidence as musical scale")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    json_file = f"scale_validation_results_{timestamp}.json"
    with open(json_file, 'w') as f:
        json.dump({
            'timestamp': timestamp,
            'summary': {
                'total': len(results),
                'keep': len(keep),
                'review': len(review),
                'remove': len(remove)
            },
            'results': results
        }, f, indent=2)
    print(f"\n💾 JSON results saved to: {json_file}")
    
    md_file = f"SCALE_VALIDATION_REPORT_{timestamp}.md"
    generate_markdown_report(results, md_file)
    
    # Also save a "latest" version
    with open("scale_validation_results.json", 'w') as f:
        json.dump({
            'timestamp': timestamp,
            'summary': {
                'total': len(results),
                'keep': len(keep),
                'review': len(review),
                'remove': len(remove)
            },
            'results': results
        }, f, indent=2)
    
    generate_markdown_report(results, "SCALE_VALIDATION_REPORT.md")
    
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())