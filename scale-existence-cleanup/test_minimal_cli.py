#!/usr/bin/env python3
"""
Minimal CLI test to verify basic functionality.
"""

import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from configuration_manager import ConfigurationManager

def test_basic_cli():
    """Test basic CLI functionality."""
    parser = argparse.ArgumentParser(description="Test CLI")
    parser.add_argument('--config', help='Config file')
    
    subparsers = parser.add_subparsers(dest='command')
    
    # Config command
    config_parser = subparsers.add_parser('config')
    config_subparsers = config_parser.add_subparsers(dest='config_command')
    
    create_parser = config_subparsers.add_parser('create-sample')
    create_parser.add_argument('--output', default='test-output.yaml')
    
    # Parse args
    args = parser.parse_args()
    
    if args.command == 'config' and args.config_command == 'create-sample':
        config_manager = ConfigurationManager()
        config_manager.create_sample_config_file(args.output)
        print(f"Sample configuration created: {args.output}")
        return 0
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    sys.exit(test_basic_cli())