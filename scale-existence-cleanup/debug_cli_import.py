#!/usr/bin/env python3
"""
Debug CLI import issues.
"""

import sys
import traceback
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

try:
    print("Attempting to import cli module...")
    import cli
    print(f"CLI module imported successfully. Dir: {dir(cli)}")
    
    if hasattr(cli, 'ScaleCleanupCLI'):
        print("ScaleCleanupCLI class found")
    else:
        print("ScaleCleanupCLI class NOT found")
    
    if hasattr(cli, 'main'):
        print("main function found")
    else:
        print("main function NOT found")
        
except Exception as e:
    print(f"Error importing cli: {e}")
    traceback.print_exc()

# Try importing individual components
print("\nTesting individual imports...")
try:
    from configuration_manager import ConfigurationManager
    print("ConfigurationManager: OK")
except Exception as e:
    print(f"ConfigurationManager: ERROR - {e}")

try:
    from config import SystemConfig
    print("SystemConfig: OK")
except Exception as e:
    print(f"SystemConfig: ERROR - {e}")

try:
    from models import ScaleData
    print("ScaleData: OK")
except Exception as e:
    print(f"ScaleData: ERROR - {e}")