#!/usr/bin/env python3
"""
Fix trailing commas in music-theory-engine.js that are causing syntax errors
"""

import re

def fix_trailing_commas():
    """Fix trailing commas in the music theory engine."""
    
    print("🔧 Reading music-theory-engine.js...")
    with open('music-theory-engine.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix trailing commas in objects (before closing brace)
    print("🔧 Fixing trailing commas before closing braces...")
    content = re.sub(r',(\s*\n\s*\})', r'\1', content)
    
    # Fix trailing commas in arrays (before closing bracket)  
    print("🔧 Fixing trailing commas before closing brackets...")
    content = re.sub(r',(\s*\n\s*\])', r'\1', content)
    
    # Fix specific pattern: contentScore: 0.x, followed by closing brace
    print("🔧 Fixing contentScore trailing commas...")
    content = re.sub(r'("contentScore":\s*[0-9.]+),(\s*\n\s*\})', r'\1\2', content)
    
    print("💾 Saving fixed music-theory-engine.js...")
    with open('music-theory-engine.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed trailing commas!")

if __name__ == '__main__':
    fix_trailing_commas()