#!/usr/bin/env python3
"""
Test script for the CLI functionality.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from cli import ScaleCleanupCLI

def test_cli_help():
    """Test CLI help command."""
    cli = ScaleCleanupCLI()
    try:
        result = cli.main(['--help'])
        print(f"CLI help test result: {result}")
    except SystemExit as e:
        print(f"CLI help test completed with exit code: {e.code}")

def test_config_create():
    """Test config creation command."""
    cli = ScaleCleanupCLI()
    try:
        result = cli.main(['config', 'create-sample', '--output', 'test-cli-config.yaml'])
        print(f"Config creation test result: {result}")
    except SystemExit as e:
        print(f"Config creation test completed with exit code: {e.code}")

if __name__ == '__main__':
    print("Testing CLI functionality...")
    test_cli_help()
    test_config_create()
    print("CLI tests completed.")