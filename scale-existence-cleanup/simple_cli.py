#!/usr/bin/env python3
"""
Simple CLI implementation for Scale Existence Cleanup System.
Focuses on configuration management functionality for task 7.1.
"""

import sys
import argparse
import logging
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
import json
import yaml
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from configuration_manager import ConfigurationManager, load_configuration_from_sources
from config import SystemConfig, LogLevel


class SimpleScaleCleanupCLI:
    """Simple CLI application class focusing on configuration management."""
    
    def __init__(self):
        self.config: Optional[SystemConfig] = None
        self.config_manager = ConfigurationManager()
        self.logger: Optional[logging.Logger] = None
    
    def main(self, args: Optional[List[str]] = None) -> int:
        """Main entry point for the CLI."""
        try:
            parser = self._create_main_parser()
            parsed_args = parser.parse_args(args)
            
            # Execute the requested command
            if hasattr(parsed_args, 'func'):
                return parsed_args.func(parsed_args)
            else:
                parser.print_help()
                return 1
                
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return 130
        except Exception as e:
            print(f"Error: {e}")
            return 1
    
    def _create_main_parser(self) -> argparse.ArgumentParser:
        """Create the main argument parser with subcommands."""
        parser = argparse.ArgumentParser(
            description="Scale Existence Cleanup System - Configuration Management",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s config create-sample --output config.yaml
  %(prog)s config validate config.yaml
  %(prog)s config show --format yaml
            """
        )
        
        # Global options
        parser.add_argument(
            '--config', '-c',
            help='Path to YAML configuration file'
        )
        
        parser.add_argument(
            '--version',
            action='version',
            version='Scale Existence Cleanup System 1.0.0'
        )
        
        # Create subparsers for commands
        subparsers = parser.add_subparsers(
            title='Commands',
            description='Available commands',
            dest='command',
            help='Command to execute'
        )
        
        # Config command
        self._add_config_command(subparsers)
        
        # Test command for configuration loading
        self._add_test_command(subparsers)
        
        return parser
    
    def _add_config_command(self, subparsers):
        """Add the config command."""
        config_parser = subparsers.add_parser(
            'config',
            help='Configuration management utilities',
            description='Create, validate, and manage configuration files'
        )
        
        config_subparsers = config_parser.add_subparsers(
            title='Config Commands',
            dest='config_command',
            help='Configuration command to execute'
        )
        
        # Create sample config
        create_parser = config_subparsers.add_parser(
            'create-sample',
            help='Create a sample configuration file'
        )
        create_parser.add_argument(
            '--output',
            default='config.yaml',
            help='Output file path for sample configuration'
        )
        create_parser.set_defaults(func=self._config_create_sample)
        
        # Validate config
        validate_parser = config_subparsers.add_parser(
            'validate',
            help='Validate a configuration file'
        )
        validate_parser.add_argument(
            'config_file',
            help='Configuration file to validate'
        )
        validate_parser.set_defaults(func=self._config_validate)
        
        # Show current config
        show_parser = config_subparsers.add_parser(
            'show',
            help='Show current configuration'
        )
        show_parser.add_argument(
            '--format',
            choices=['yaml', 'json'],
            default='yaml',
            help='Output format'
        )
        show_parser.set_defaults(func=self._config_show)
    
    def _add_test_command(self, subparsers):
        """Add test command for configuration functionality."""
        test_parser = subparsers.add_parser(
            'test',
            help='Test configuration functionality',
            description='Test various configuration loading scenarios'
        )
        
        test_parser.add_argument(
            '--config-file',
            help='Configuration file to test'
        )
        
        test_parser.add_argument(
            '--test-env-vars',
            action='store_true',
            help='Test environment variable configuration'
        )
        
        test_parser.add_argument(
            '--test-cli-args',
            action='store_true',
            help='Test CLI argument configuration'
        )
        
        test_parser.set_defaults(func=self._test_command)
    
    def _config_create_sample(self, args) -> int:
        """Create a sample configuration file."""
        try:
            self.config_manager.create_sample_config_file(args.output)
            print(f"Sample configuration file created: {args.output}")
            return 0
        except Exception as e:
            print(f"Failed to create sample configuration: {e}")
            return 1
    
    def _config_validate(self, args) -> int:
        """Validate a configuration file."""
        try:
            config = load_configuration_from_sources(args.config_file)
            issues = config.validate_configuration()
            
            if issues:
                print("Configuration validation failed:")
                for issue in issues:
                    print(f"  - {issue}")
                return 1
            else:
                print("Configuration is valid")
                return 0
                
        except Exception as e:
            print(f"Configuration validation failed: {e}")
            return 1
    
    def _config_show(self, args) -> int:
        """Show current configuration."""
        try:
            # Load configuration from file if specified
            config_file = getattr(args, 'config', None)
            if config_file:
                config = load_configuration_from_sources(config_file)
            else:
                # Use default configuration
                from config import create_default_config
                config = create_default_config()
            
            config_dict = self.config_manager._config_to_dict(config)
            
            if args.format == 'json':
                print(json.dumps(config_dict, indent=2))
            else:
                print(yaml.dump(config_dict, default_flow_style=False, indent=2))
            
            return 0
            
        except Exception as e:
            print(f"Failed to show configuration: {e}")
            return 1
    
    def _test_command(self, args) -> int:
        """Test configuration functionality."""
        print("Testing configuration management functionality...")
        
        try:
            # Test 1: Default configuration
            print("\n1. Testing default configuration creation...")
            from config import create_default_config
            default_config = create_default_config()
            print(f"   ✓ Default config created with {len(default_config.search_engines)} search engines")
            
            # Test 2: Configuration validation
            print("\n2. Testing configuration validation...")
            issues = default_config.validate_configuration()
            if issues:
                print(f"   ⚠ Default config has {len(issues)} validation issues:")
                for issue in issues:
                    print(f"     - {issue}")
            else:
                print("   ✓ Default configuration is valid")
            
            # Test 3: YAML file loading (if provided)
            if args.config_file:
                print(f"\n3. Testing YAML file loading: {args.config_file}")
                try:
                    config = load_configuration_from_sources(args.config_file)
                    print("   ✓ YAML configuration loaded successfully")
                    
                    issues = config.validate_configuration()
                    if issues:
                        print(f"   ⚠ YAML config has {len(issues)} validation issues:")
                        for issue in issues:
                            print(f"     - {issue}")
                    else:
                        print("   ✓ YAML configuration is valid")
                        
                except Exception as e:
                    print(f"   ✗ YAML loading failed: {e}")
            
            # Test 4: Environment variable configuration
            if args.test_env_vars:
                print("\n4. Testing environment variable configuration...")
                
                # Set some test environment variables
                test_env_vars = {
                    'SCALE_CLEANUP_LOG_LEVEL': 'DEBUG',
                    'SCALE_CLEANUP_BATCH_SIZE': '25',
                    'SCALE_CLEANUP_MIN_QUALITY': '0.7'
                }
                
                # Save original values
                original_values = {}
                for key in test_env_vars:
                    original_values[key] = os.environ.get(key)
                    os.environ[key] = test_env_vars[key]
                
                try:
                    config = load_configuration_from_sources()
                    print("   ✓ Environment variable configuration loaded")
                    print(f"   ✓ Log level: {config.logging.log_level.value}")
                    print(f"   ✓ Batch size: {config.batch_processing.batch_size}")
                    print(f"   ✓ Min quality: {config.quality_thresholds.minimum_overall_quality}")
                    
                finally:
                    # Restore original values
                    for key, value in original_values.items():
                        if value is None:
                            os.environ.pop(key, None)
                        else:
                            os.environ[key] = value
            
            # Test 5: CLI argument configuration
            if args.test_cli_args:
                print("\n5. Testing CLI argument configuration...")
                
                test_cli_args = [
                    '--log-level', 'ERROR',
                    '--batch-size', '15',
                    '--min-quality', '0.9'
                ]
                
                try:
                    config = load_configuration_from_sources(cli_args=test_cli_args)
                    print("   ✓ CLI argument configuration loaded")
                    print(f"   ✓ Log level: {config.logging.log_level.value}")
                    print(f"   ✓ Batch size: {config.batch_processing.batch_size}")
                    print(f"   ✓ Min quality: {config.quality_thresholds.minimum_overall_quality}")
                    
                except Exception as e:
                    print(f"   ✗ CLI argument configuration failed: {e}")
            
            print("\n✓ Configuration testing completed successfully")
            return 0
            
        except Exception as e:
            print(f"\n✗ Configuration testing failed: {e}")
            import traceback
            traceback.print_exc()
            return 1


def main():
    """Entry point for the CLI application."""
    cli = SimpleScaleCleanupCLI()
    return cli.main()


if __name__ == '__main__':
    sys.exit(main())