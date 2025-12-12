#!/usr/bin/env python3

print("Starting import test...")

try:
    print("Importing requests...")
    import requests
    print("✓ requests imported")
except Exception as e:
    print(f"✗ requests failed: {e}")

try:
    print("Importing BeautifulSoup...")
    from bs4 import BeautifulSoup
    print("✓ BeautifulSoup imported")
except Exception as e:
    print(f"✗ BeautifulSoup failed: {e}")

try:
    print("Importing interfaces...")
    from src.interfaces import QualityCheckerInterface, handle_quality_check_error
    print("✓ interfaces imported")
except Exception as e:
    print(f"✗ interfaces failed: {e}")

try:
    print("Importing models...")
    from src.models import QualityAssessment, ScaleInformation
    print("✓ models imported")
except Exception as e:
    print(f"✗ models failed: {e}")

try:
    print("Importing config...")
    from src.config import SystemConfig
    print("✓ config imported")
except Exception as e:
    print(f"✗ config failed: {e}")

print("All imports successful, now trying to import quality_checker...")

try:
    import src.quality_checker
    print("✓ quality_checker module imported")
    print(f"Module contents: {dir(src.quality_checker)}")
except Exception as e:
    print(f"✗ quality_checker failed: {e}")
    import traceback
    traceback.print_exc()