#!/usr/bin/env python3
"""
Simple demo script to validate scales using basic web search.
This demonstrates the concept without the complex existing system.
"""

import requests
import time
import random
import re
import json
from pathlib import Path
from typing import List, Dict, Any
from urllib.parse import quote_plus
from bs4 import BeautifulSoup


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


def search_duckduckgo(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Search DuckDuckGo for scale information."""
    try:
        # DuckDuckGo HTML search
        url = "https://duckduckgo.com/html/"
        params = {
            'q': query,
            'kl': 'us-en'
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        results = []
        
        # Parse DuckDuckGo results
        result_elements = soup.find_all('div', class_='result')
        
        for element in result_elements[:max_results]:
            try:
                title_elem = element.find('a', class_='result__a')
                snippet_elem = element.find('a', class_='result__snippet')
                
                if title_elem and title_elem.get('href'):
                    url = title_elem['href']
                    title = title_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                    
                    results.append({
                        'url': url,
                        'title': title,
                        'snippet': snippet
                    })
                    
            except Exception as e:
                continue
        
        return results
        
    except Exception as e:
        print(f"Search error: {e}")
        return []


def evaluate_scale_relevance(results: List[Dict[str, Any]], scale_name: str) -> Dict[str, Any]:
    """Evaluate if search results are relevant to the musical scale."""
    if not results:
        return {
            'relevant_results': 0,
            'music_theory_results': 0,
            'quality_score': 0.0,
            'recommendation': 'REMOVE',
            'reason': 'No search results found'
        }
    
    relevant_results = 0
    music_theory_results = 0
    total_relevance = 0.0
    
    # Keywords that indicate music theory content
    music_keywords = [
        'scale', 'music', 'theory', 'notes', 'intervals', 'chord', 'harmony', 
        'melody', 'mode', 'key', 'degree', 'semitone', 'tone', 'musical',
        'composition', 'instrument', 'guitar', 'piano', 'ethnomusicology'
    ]
    
    # Keywords that indicate cultural/traditional music
    cultural_keywords = [
        'traditional', 'folk', 'cultural', 'ethnic', 'indigenous', 'ancient',
        'classical', 'medieval', 'renaissance', 'baroque', 'regional'
    ]
    
    scale_name_clean = scale_name.replace('_', ' ').lower()
    
    for result in results:
        content = (result['title'] + ' ' + result['snippet']).lower()
        
        # Check if scale name appears in content
        scale_mentioned = scale_name_clean in content or scale_name.lower() in content
        
        # Count music theory keywords
        music_keyword_count = sum(1 for keyword in music_keywords if keyword in content)
        cultural_keyword_count = sum(1 for keyword in cultural_keywords if keyword in content)
        
        # Calculate relevance score for this result
        relevance = 0.0
        
        if scale_mentioned:
            relevance += 0.4
        
        if music_keyword_count > 0:
            relevance += min(music_keyword_count * 0.1, 0.3)
            music_theory_results += 1
        
        if cultural_keyword_count > 0:
            relevance += min(cultural_keyword_count * 0.05, 0.2)
        
        # Bonus for educational domains
        if any(domain in result['url'].lower() for domain in ['.edu', 'wikipedia', 'britannica', 'musictheory']):
            relevance += 0.1
        
        if relevance > 0.2:  # Minimum threshold for relevance
            relevant_results += 1
            total_relevance += relevance
    
    # Calculate overall quality score
    if relevant_results > 0:
        avg_relevance = total_relevance / relevant_results
        quality_score = min(avg_relevance * (relevant_results / len(results)), 1.0)
    else:
        quality_score = 0.0
    
    # Make recommendation
    if relevant_results == 0:
        recommendation = 'REMOVE'
        reason = 'No relevant results found'
    elif music_theory_results == 0:
        recommendation = 'REMOVE'
        reason = 'No music theory content found'
    elif quality_score < 0.3:
        recommendation = 'REMOVE'
        reason = f'Low quality score: {quality_score:.2f}'
    elif relevant_results == 1:
        recommendation = 'REVIEW'
        reason = 'Only one relevant source found'
    else:
        recommendation = 'KEEP'
        reason = f'Found {relevant_results} relevant sources'
    
    return {
        'relevant_results': relevant_results,
        'music_theory_results': music_theory_results,
        'quality_score': quality_score,
        'recommendation': recommendation,
        'reason': reason,
        'total_results': len(results)
    }


def validate_scale(scale: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a single scale by searching for it online."""
    scale_name = scale['name']
    display_name = scale['display_name']
    
    print(f"\n🔍 Searching for: {display_name} ({scale_name})")
    
    # Try different search terms
    search_terms = [
        f'"{display_name}" scale music theory',
        f'{display_name} musical scale',
        f'{scale_name} scale music',
        f'"{display_name}" music scale intervals'
    ]
    
    all_results = []
    
    for search_term in search_terms:
        try:
            results = search_duckduckgo(search_term, max_results=3)
            all_results.extend(results)
            time.sleep(1)  # Be respectful to the search engine
        except Exception as e:
            print(f"   ⚠️  Search failed for '{search_term}': {e}")
            continue
    
    # Remove duplicates based on URL
    unique_results = {}
    for result in all_results:
        url = result['url'].lower().rstrip('/')
        if url not in unique_results:
            unique_results[url] = result
    
    final_results = list(unique_results.values())
    
    # Evaluate relevance
    evaluation = evaluate_scale_relevance(final_results, scale_name)
    
    print(f"   📊 Found {len(final_results)} total results, {evaluation['relevant_results']} relevant")
    print(f"   🎵 Music theory results: {evaluation['music_theory_results']}")
    print(f"   ⭐ Quality score: {evaluation['quality_score']:.2f}")
    print(f"   💡 Recommendation: {evaluation['recommendation']} - {evaluation['reason']}")
    
    # Show best results
    if final_results:
        print(f"   🔗 Best result: {final_results[0]['title'][:60]}...")
    
    return {
        'scale_name': scale_name,
        'display_name': display_name,
        'intervals': scale['intervals'],
        'search_results': final_results[:3],  # Keep top 3 for report
        'total_results': len(final_results),
        **evaluation
    }


def main():
    """Main demonstration function."""
    print("🎵 Simple Scale Validation Demo - Testing 20 Random Scales")
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
        
        # Add delay between searches to be respectful
        if i < len(selected_scales):
            time.sleep(2)
    
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
    output_file = f"simple_scale_validation_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_scales': len(results),
                'keep_count': keep_count,
                'review_count': review_count,
                'remove_count': remove_count,
                'validation_method': 'DuckDuckGo search with relevance analysis'
            },
            'results': results
        }, f, indent=2)
    
    print(f"💾 Detailed results saved to: {output_file}")
    
    print("\n🎵 Demo completed! This demonstrates:")
    print("   • Searching the internet for scale information")
    print("   • Evaluating source quality and music theory relevance")
    print("   • Making removal recommendations based on evidence")
    print("   • Distinguishing between real scales and questionable entries")
    print("   • Example: 'San Bushmen' might exist as a people, but 'San Bushmen Scale' needs validation")
    
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())