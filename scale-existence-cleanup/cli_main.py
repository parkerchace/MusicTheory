#!/usr/bin/env python3
"""
Entry point for the Scale Existence Cleanup CLI.
This script can be run directly and handles the import path correctly.
"""

import sys
import os
from pathlib import Path

# Add the src directory to Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

# Now import and run the CLI
if __name__ == '__main__':
    from cli import main
    sys.exit(main())