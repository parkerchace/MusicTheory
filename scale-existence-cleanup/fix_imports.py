#!/usr/bin/env python3
"""
Fix relative imports in all Python files to support both module and script execution.
"""

import os
import re
from pathlib import Path

def fix_relative_imports(file_path):
    """Fix relative imports in a Python file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all relative imports
    relative_import_pattern = r'^from \.(\w+) import (.+)$'
    
    lines = content.split('\n')
    new_lines = []
    in_import_block = False
    import_lines = []
    
    for line in lines:
        match = re.match(relative_import_pattern, line)
        if match:
            if not in_import_block:
                # Start of import block
                in_import_block = True
                import_lines = []
                new_lines.append('try:')
                new_lines.append('    # Try relative imports first (when used as module)')
            
            # Add the relative import
            new_lines.append(f'    {line}')
            
            # Store the absolute import version
            module_name = match.group(1)
            imports = match.group(2)
            import_lines.append(f'    from {module_name} import {imports}')
            
        else:
            if in_import_block:
                # End of import block
                in_import_block = False
                new_lines.append('except ImportError:')
                new_lines.append('    # Fall back to absolute imports (when run as script)')
                new_lines.extend(import_lines)
            
            new_lines.append(line)
    
    # Handle case where file ends with imports
    if in_import_block:
        new_lines.append('except ImportError:')
        new_lines.append('    # Fall back to absolute imports (when run as script)')
        new_lines.extend(import_lines)
    
    # Write back the modified content
    new_content = '\n'.join(new_lines)
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed imports in {file_path}")
        return True
    return False

def main():
    """Fix imports in all Python files in src directory."""
    src_dir = Path(__file__).parent / 'src'
    
    files_to_fix = [
        'search_engine.py',
        'cleanup_engine.py', 
        'javascript_database_reader.py',
        'javascript_database_writer.py',
        'reporting_system.py',
        'search_logging.py',
        'quality_checker.py',
        'cultural_search_engine.py',
        'fair_use_compliance.py',
        'base_implementations.py',
        'interfaces.py'
    ]
    
    fixed_count = 0
    for filename in files_to_fix:
        file_path = src_dir / filename
        if file_path.exists():
            if fix_relative_imports(file_path):
                fixed_count += 1
        else:
            print(f"File not found: {file_path}")
    
    print(f"Fixed imports in {fixed_count} files")

if __name__ == '__main__':
    main()