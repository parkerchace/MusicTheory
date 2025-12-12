#!/usr/bin/env python3
"""
Debug CLI import step by step.
"""

import sys
import traceback
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

print("Testing imports step by step...")

try:
    print("1. Importing sys, argparse, logging, os...")
    import sys, argparse, logging, os
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("2. Importing pathlib, typing...")
    from pathlib import Path
    from typing import List, Optional, Dict, Any
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("3. Importing json, time, signal, datetime...")
    import json, time, signal
    from datetime import datetime
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("4. Importing configuration_manager...")
    from configuration_manager import ConfigurationManager, load_configuration_from_sources
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("5. Importing config...")
    from config import SystemConfig, LogLevel
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("6. Importing models...")
    from models import ScaleData
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("7. Importing search_engine...")
    from search_engine import ScaleSearchEngine
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("8. Importing quality_checker...")
    from quality_checker import DocumentationQualityChecker
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("9. Importing cleanup_engine...")
    from cleanup_engine import CleanupEngine
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("10. Importing javascript_database_reader...")
    from javascript_database_reader import JavaScriptDatabaseReader
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("11. Importing javascript_database_writer...")
    from javascript_database_writer import JavaScriptDatabaseWriter
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("12. Importing reporting_system...")
    from reporting_system import ComprehensiveReportingSystem as ReportingSystem
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("13. Importing search_logging...")
    from search_logging import SearchLogger
    print("   OK")
except Exception as e:
    print(f"   ERROR: {e}")

print("\nAll imports successful! Now testing CLI class definition...")

# Now try to define a simple class to see if that works
try:
    class TestCLI:
        def __init__(self):
            pass
    
    print("Test class definition: OK")
    print(f"TestCLI in globals: {'TestCLI' in globals()}")
    
except Exception as e:
    print(f"Test class definition: ERROR - {e}")
    traceback.print_exc()