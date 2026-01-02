#!/usr/bin/env python3
"""Quick test to see if ddgs is working"""

from ddgs import DDGS

print("Testing DDGS search...")

try:
    ddgs = DDGS()
    results = list(ddgs.text("double harmonic major scale", max_results=5))
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  - {r.get('title', 'No title')}")
        print(f"    URL: {r.get('href', 'No URL')}")
        print(f"    Body: {r.get('body', 'No body')[:100]}...")
        print()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()