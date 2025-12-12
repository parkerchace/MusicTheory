"""
Configuration Manager for the Scale Existence Cleanup System.

Handles loading configuration from YAML files, environment variables,
and command-line arguments with proper precedence.
"""

import os
import argparse
import yaml
from typing import Dict, Any, Optional, List
from pathlib import Path
import logging

try:
    from .config import (
        SystemConfig, SearchEngineConfig, QualityThresholds, RemovalCriteria,
        FairUseConfig, BatchProcessingConfig, LoggingConfig, DatabaseConfig,
        ReportingConfig, LogLevel, create_default_config
    )
except ImportError:
    from config import (
        SystemConfig, SearchEngineConfig, QualityThresholds, RemovalCriteria,
        FairUseConfig, BatchProcessingConfig, LoggingConfig, DatabaseConfig,
        ReportingConfig, LogLevel, create_default_config
    )


class ConfigurationManager:
    """Manages configuration loading from multiple sources with precedence."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._config: Optional[SystemConfig] = None
    
    def load_configuration(
        self,
        config_file: Optional[str] = None,
        cli_args: Optional[List[str]] = None
    ) -> SystemConfig:
        """
        Load configuration from multiple sources with precedence:
        1. Command-line arguments (highest priority)
        2. Environment variables
        3. YAML configuration file
        4. Default values (lowest priority)
        """
        # Start with default configuration
        config = create_default_config()
        
        # Load from YAML file if provided
        if config_file:
            config = self._load_from_yaml(config_file, config)
        
        # Override with environment variables
        config = self._load_from_environment(config)
        
        # Override with command-line arguments
        if cli_args is not None:
            config = self._load_from_cli_args(cli_args, config)
        
        # Validate final configuration
        issues = config.validate_configuration()
        if issues:
            raise ValueError(f"Configuration validation failed: {'; '.join(issues)}")
        
        self._config = config
        return config
    
    def _load_from_yaml(self, config_file: str, base_config: SystemConfig) -> SystemConfig:
        """Load configuration from YAML file."""
        config_path = Path(config_file)
        
        if not config_path.exists():
            self.logger.warning(f"Configuration file not found: {config_file}")
            return base_config
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                yaml_data = yaml.safe_load(f)
            
            if not yaml_data:
                self.logger.warning(f"Empty configuration file: {config_file}")
                return base_config
            
            # Update configuration sections
            config = self._update_config_from_dict(base_config, yaml_data)
            self.logger.info(f"Loaded configuration from {config_file}")
            return config
            
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in configuration file {config_file}: {e}")
        except Exception as e:
            raise ValueError(f"Error loading configuration file {config_file}: {e}")
    
    def _load_from_environment(self, base_config: SystemConfig) -> SystemConfig:
        """Load configuration from environment variables."""
        config = base_config
        
        # Search engine API keys
        for engine in config.search_engines:
            env_key = f"SCALE_CLEANUP_{engine.name.upper()}_API_KEY"
            if env_key in os.environ:
                engine.api_key = os.environ[env_key]
                self.logger.debug(f"Loaded API key for {engine.name} from environment")
        
        # Database configuration
        if "SCALE_CLEANUP_DATABASE_PATH" in os.environ:
            config.database.database_file_path = os.environ["SCALE_CLEANUP_DATABASE_PATH"]
        
        if "SCALE_CLEANUP_BACKUP_DIR" in os.environ:
            config.database.backup_directory = os.environ["SCALE_CLEANUP_BACKUP_DIR"]
        
        # Logging configuration
        if "SCALE_CLEANUP_LOG_LEVEL" in os.environ:
            try:
                config.logging.log_level = LogLevel(os.environ["SCALE_CLEANUP_LOG_LEVEL"].upper())
            except ValueError:
                self.logger.warning(f"Invalid log level in environment: {os.environ['SCALE_CLEANUP_LOG_LEVEL']}")
        
        if "SCALE_CLEANUP_LOG_FILE" in os.environ:
            config.logging.log_file_path = os.environ["SCALE_CLEANUP_LOG_FILE"]
        
        # Batch processing configuration
        if "SCALE_CLEANUP_BATCH_SIZE" in os.environ:
            try:
                config.batch_processing.batch_size = int(os.environ["SCALE_CLEANUP_BATCH_SIZE"])
            except ValueError:
                self.logger.warning(f"Invalid batch size in environment: {os.environ['SCALE_CLEANUP_BATCH_SIZE']}")
        
        if "SCALE_CLEANUP_DELAY_SECONDS" in os.environ:
            try:
                config.batch_processing.delay_between_batches_seconds = float(os.environ["SCALE_CLEANUP_DELAY_SECONDS"])
            except ValueError:
                self.logger.warning(f"Invalid delay in environment: {os.environ['SCALE_CLEANUP_DELAY_SECONDS']}")
        
        # Quality thresholds
        threshold_mappings = {
            "SCALE_CLEANUP_MIN_COMPLETENESS": "minimum_information_completeness",
            "SCALE_CLEANUP_MIN_EDUCATIONAL": "minimum_educational_value",
            "SCALE_CLEANUP_MIN_AUTHORITY": "minimum_source_authority",
            "SCALE_CLEANUP_MIN_QUALITY": "minimum_overall_quality"
        }
        
        for env_key, attr_name in threshold_mappings.items():
            if env_key in os.environ:
                try:
                    value = float(os.environ[env_key])
                    if 0.0 <= value <= 1.0:
                        setattr(config.quality_thresholds, attr_name, value)
                    else:
                        self.logger.warning(f"Invalid threshold value in environment {env_key}: {value}")
                except ValueError:
                    self.logger.warning(f"Invalid threshold value in environment {env_key}: {os.environ[env_key]}")
        
        # Removal criteria
        if "SCALE_CLEANUP_MIN_SOURCES" in os.environ:
            try:
                config.removal_criteria.minimum_sources_required = int(os.environ["SCALE_CLEANUP_MIN_SOURCES"])
            except ValueError:
                self.logger.warning(f"Invalid minimum sources in environment: {os.environ['SCALE_CLEANUP_MIN_SOURCES']}")
        
        if "SCALE_CLEANUP_ALLOW_COMMERCIAL" in os.environ:
            config.removal_criteria.allow_commercial_sources = os.environ["SCALE_CLEANUP_ALLOW_COMMERCIAL"].lower() in ("true", "1", "yes")
        
        if "SCALE_CLEANUP_REQUIRE_EDUCATIONAL" in os.environ:
            config.removal_criteria.require_educational_sources = os.environ["SCALE_CLEANUP_REQUIRE_EDUCATIONAL"].lower() in ("true", "1", "yes")
        
        # Fair use configuration
        if "SCALE_CLEANUP_MAX_CONTENT_LENGTH" in os.environ:
            try:
                config.fair_use.max_content_length_per_source = int(os.environ["SCALE_CLEANUP_MAX_CONTENT_LENGTH"])
            except ValueError:
                self.logger.warning(f"Invalid max content length in environment: {os.environ['SCALE_CLEANUP_MAX_CONTENT_LENGTH']}")
        
        if "SCALE_CLEANUP_USER_AGENT" in os.environ:
            config.fair_use.user_agent = os.environ["SCALE_CLEANUP_USER_AGENT"]
        
        return config
    
    def _load_from_cli_args(self, cli_args: List[str], base_config: SystemConfig) -> SystemConfig:
        """Load configuration from command-line arguments."""
        parser = self._create_argument_parser()
        args = parser.parse_args(cli_args)
        
        config = base_config
        
        # Update configuration based on parsed arguments
        if hasattr(args, 'config_file') and args.config_file:
            # Config file is handled separately in load_configuration
            pass
        
        if hasattr(args, 'database_path') and args.database_path:
            config.database.database_file_path = args.database_path
        
        if hasattr(args, 'backup_dir') and args.backup_dir:
            config.database.backup_directory = args.backup_dir
        
        if hasattr(args, 'log_level') and args.log_level:
            config.logging.log_level = LogLevel(args.log_level.upper())
        
        if hasattr(args, 'log_file') and args.log_file:
            config.logging.log_file_path = args.log_file
        
        if hasattr(args, 'batch_size') and args.batch_size:
            config.batch_processing.batch_size = args.batch_size
        
        if hasattr(args, 'delay') and args.delay:
            config.batch_processing.delay_between_batches_seconds = args.delay
        
        if hasattr(args, 'min_quality') and args.min_quality:
            config.quality_thresholds.minimum_overall_quality = args.min_quality
        
        if hasattr(args, 'min_sources') and args.min_sources:
            config.removal_criteria.minimum_sources_required = args.min_sources
        
        if hasattr(args, 'allow_commercial') and args.allow_commercial is not None:
            config.removal_criteria.allow_commercial_sources = args.allow_commercial
        
        if hasattr(args, 'require_educational') and args.require_educational is not None:
            config.removal_criteria.require_educational_sources = args.require_educational
        
        if hasattr(args, 'no_backup') and args.no_backup:
            config.database.create_backups = False
        
        if hasattr(args, 'dry_run') and args.dry_run:
            # Add dry run flag to config (we'll need to add this to the config classes)
            setattr(config, 'dry_run', True)
        
        return config
    
    def _create_argument_parser(self) -> argparse.ArgumentParser:
        """Create command-line argument parser."""
        parser = argparse.ArgumentParser(
            description="Scale Existence Cleanup System",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s validate --config config.yaml
  %(prog)s cleanup --database-path ../music-theory-engine.js --batch-size 20
  %(prog)s report --output-dir ./reports
            """
        )
        
        # Global options
        parser.add_argument(
            '--config', '-c',
            dest='config_file',
            help='Path to YAML configuration file'
        )
        
        parser.add_argument(
            '--database-path',
            help='Path to the scale database file'
        )
        
        parser.add_argument(
            '--backup-dir',
            help='Directory for database backups'
        )
        
        parser.add_argument(
            '--log-level',
            choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
            help='Logging level'
        )
        
        parser.add_argument(
            '--log-file',
            help='Path to log file'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            help='Number of scales to process in each batch'
        )
        
        parser.add_argument(
            '--delay',
            type=float,
            help='Delay between batches in seconds'
        )
        
        parser.add_argument(
            '--min-quality',
            type=float,
            help='Minimum overall quality threshold (0.0-1.0)'
        )
        
        parser.add_argument(
            '--min-sources',
            type=int,
            help='Minimum number of sources required'
        )
        
        parser.add_argument(
            '--allow-commercial',
            action='store_true',
            help='Allow commercial sources'
        )
        
        parser.add_argument(
            '--require-educational',
            action='store_true',
            help='Require educational sources'
        )
        
        parser.add_argument(
            '--no-backup',
            action='store_true',
            help='Skip creating database backups'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform validation without making changes'
        )
        
        return parser
    
    def _update_config_from_dict(self, config: SystemConfig, data: Dict[str, Any]) -> SystemConfig:
        """Update configuration object from dictionary data."""
        # Handle search engines
        if 'search_engines' in data:
            search_engines = []
            for engine_data in data['search_engines']:
                search_engines.append(SearchEngineConfig(**engine_data))
            config.search_engines = search_engines
        
        # Handle search terms templates
        if 'search_terms_templates' in data:
            config.search_terms_templates = data['search_terms_templates']
        
        # Handle cultural search terms
        if 'cultural_search_terms' in data:
            config.cultural_search_terms = data['cultural_search_terms']
        
        # Handle scale alternative names
        if 'scale_alternative_names' in data:
            config.scale_alternative_names = data['scale_alternative_names']
        
        # Handle configuration sections
        section_mappings = {
            'quality_thresholds': QualityThresholds,
            'removal_criteria': RemovalCriteria,
            'fair_use': FairUseConfig,
            'batch_processing': BatchProcessingConfig,
            'logging': LoggingConfig,
            'database': DatabaseConfig,
            'reporting': ReportingConfig
        }
        
        for section_name, section_class in section_mappings.items():
            if section_name in data:
                section_data = data[section_name]
                if isinstance(section_data, dict):
                    setattr(config, section_name, section_class(**section_data))
        
        return config
    
    def save_configuration(self, config: SystemConfig, output_path: str) -> None:
        """Save configuration to YAML file."""
        config_dict = self._config_to_dict(config)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                yaml.dump(config_dict, f, default_flow_style=False, indent=2)
            self.logger.info(f"Configuration saved to {output_path}")
        except Exception as e:
            raise ValueError(f"Error saving configuration to {output_path}: {e}")
    
    def _config_to_dict(self, config: SystemConfig) -> Dict[str, Any]:
        """Convert configuration object to dictionary for YAML serialization."""
        config_dict = {}
        
        # Search engines
        config_dict['search_engines'] = [
            {
                'name': engine.name,
                'enabled': engine.enabled,
                'api_key': engine.api_key,
                'api_endpoint': engine.api_endpoint,
                'rate_limit_requests_per_minute': engine.rate_limit_requests_per_minute,
                'timeout_seconds': engine.timeout_seconds,
                'max_results_per_query': engine.max_results_per_query
            }
            for engine in config.search_engines
        ]
        
        # Search terms
        config_dict['search_terms_templates'] = config.search_terms_templates
        config_dict['cultural_search_terms'] = config.cultural_search_terms
        config_dict['scale_alternative_names'] = config.scale_alternative_names
        
        # Configuration sections
        config_dict['quality_thresholds'] = {
            'minimum_information_completeness': config.quality_thresholds.minimum_information_completeness,
            'minimum_educational_value': config.quality_thresholds.minimum_educational_value,
            'minimum_source_authority': config.quality_thresholds.minimum_source_authority,
            'minimum_overall_quality': config.quality_thresholds.minimum_overall_quality
        }
        
        config_dict['removal_criteria'] = {
            'require_dedicated_sources': config.removal_criteria.require_dedicated_sources,
            'minimum_sources_required': config.removal_criteria.minimum_sources_required,
            'allow_commercial_sources': config.removal_criteria.allow_commercial_sources,
            'require_educational_sources': config.removal_criteria.require_educational_sources,
            'minimum_confidence_for_removal': config.removal_criteria.minimum_confidence_for_removal,
            'flag_ambiguous_cases': config.removal_criteria.flag_ambiguous_cases,
            'traditional_scale_leniency': config.removal_criteria.traditional_scale_leniency
        }
        
        config_dict['fair_use'] = {
            'educational_purpose_statement': config.fair_use.educational_purpose_statement,
            'max_content_length_per_source': config.fair_use.max_content_length_per_source,
            'max_sources_per_scale': config.fair_use.max_sources_per_scale,
            'respect_robots_txt': config.fair_use.respect_robots_txt,
            'user_agent': config.fair_use.user_agent
        }
        
        config_dict['batch_processing'] = {
            'batch_size': config.batch_processing.batch_size,
            'delay_between_batches_seconds': config.batch_processing.delay_between_batches_seconds,
            'max_concurrent_requests': config.batch_processing.max_concurrent_requests,
            'enable_pause_resume': config.batch_processing.enable_pause_resume,
            'checkpoint_interval': config.batch_processing.checkpoint_interval
        }
        
        config_dict['logging'] = {
            'log_level': config.logging.log_level.value,
            'log_to_file': config.logging.log_to_file,
            'log_file_path': config.logging.log_file_path,
            'log_to_console': config.logging.log_to_console,
            'max_log_file_size_mb': config.logging.max_log_file_size_mb,
            'backup_count': config.logging.backup_count
        }
        
        config_dict['database'] = {
            'database_file_path': config.database.database_file_path,
            'backup_directory': config.database.backup_directory,
            'create_backups': config.database.create_backups,
            'validate_after_modification': config.database.validate_after_modification
        }
        
        config_dict['reporting'] = {
            'generate_json_reports': config.reporting.generate_json_reports,
            'generate_markdown_reports': config.reporting.generate_markdown_reports,
            'report_directory': config.reporting.report_directory,
            'include_detailed_statistics': config.reporting.include_detailed_statistics,
            'include_removal_details': config.reporting.include_removal_details
        }
        
        return config_dict
    
    def get_current_config(self) -> Optional[SystemConfig]:
        """Get the currently loaded configuration."""
        return self._config
    
    def create_sample_config_file(self, output_path: str) -> None:
        """Create a sample configuration file with default values."""
        default_config = create_default_config()
        self.save_configuration(default_config, output_path)
        self.logger.info(f"Sample configuration file created at {output_path}")


def load_configuration_from_sources(
    config_file: Optional[str] = None,
    cli_args: Optional[List[str]] = None
) -> SystemConfig:
    """
    Convenience function to load configuration from multiple sources.
    
    Args:
        config_file: Path to YAML configuration file
        cli_args: Command-line arguments list
    
    Returns:
        Loaded and validated SystemConfig
    """
    manager = ConfigurationManager()
    return manager.load_configuration(config_file, cli_args)