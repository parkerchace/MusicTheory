"""
Configuration classes for the Scale Existence Cleanup System.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
import os


class LogLevel(Enum):
    """Logging levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class SearchEngineConfig:
    """Configuration for search engines."""
    name: str
    enabled: bool = True
    api_key: str = ""
    api_endpoint: str = ""
    rate_limit_requests_per_minute: int = 60
    timeout_seconds: int = 30
    max_results_per_query: int = 10
    
    def __post_init__(self):
        """Validate configuration."""
        if not self.name.strip():
            raise ValueError("Search engine name cannot be empty")
        if self.rate_limit_requests_per_minute <= 0:
            raise ValueError("Rate limit must be positive")
        if self.timeout_seconds <= 0:
            raise ValueError("Timeout must be positive")
        if self.max_results_per_query <= 0:
            raise ValueError("Max results per query must be positive")


@dataclass
class QualityThresholds:
    """Thresholds for quality assessment."""
    minimum_information_completeness: float = 0.3
    minimum_educational_value: float = 0.4
    minimum_source_authority: float = 0.2
    minimum_overall_quality: float = 0.5
    
    def __post_init__(self):
        """Validate thresholds."""
        thresholds = [
            ("minimum_information_completeness", self.minimum_information_completeness),
            ("minimum_educational_value", self.minimum_educational_value),
            ("minimum_source_authority", self.minimum_source_authority),
            ("minimum_overall_quality", self.minimum_overall_quality)
        ]
        
        for name, value in thresholds:
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be between 0.0 and 1.0")


@dataclass
class RemovalCriteria:
    """Criteria for scale removal decisions."""
    require_dedicated_sources: bool = True
    minimum_sources_required: int = 1
    allow_commercial_sources: bool = False
    require_educational_sources: bool = True
    minimum_confidence_for_removal: float = 0.8
    flag_ambiguous_cases: bool = True
    traditional_scale_leniency: bool = True
    
    def __post_init__(self):
        """Validate criteria."""
        if self.minimum_sources_required < 0:
            raise ValueError("Minimum sources required cannot be negative")
        if not 0.0 <= self.minimum_confidence_for_removal <= 1.0:
            raise ValueError("Minimum confidence must be between 0.0 and 1.0")


@dataclass
class FairUseConfig:
    """Configuration for fair use compliance."""
    educational_purpose_statement: str = "Educational research and database quality improvement"
    max_content_length_per_source: int = 1000
    max_sources_per_scale: int = 5
    respect_robots_txt: bool = True
    user_agent: str = "Scale-Existence-Cleanup-Bot/1.0 (Educational Research)"
    
    def __post_init__(self):
        """Validate configuration."""
        if not self.educational_purpose_statement.strip():
            raise ValueError("Educational purpose statement cannot be empty")
        if self.max_content_length_per_source <= 0:
            raise ValueError("Max content length must be positive")
        if self.max_sources_per_scale <= 0:
            raise ValueError("Max sources per scale must be positive")
        if not self.user_agent.strip():
            raise ValueError("User agent cannot be empty")


@dataclass
class BatchProcessingConfig:
    """Configuration for batch processing operations."""
    batch_size: int = 10
    delay_between_batches_seconds: float = 1.0
    max_concurrent_requests: int = 3
    enable_pause_resume: bool = True
    checkpoint_interval: int = 50
    
    def __post_init__(self):
        """Validate configuration."""
        if self.batch_size <= 0:
            raise ValueError("Batch size must be positive")
        if self.delay_between_batches_seconds < 0:
            raise ValueError("Delay between batches cannot be negative")
        if self.max_concurrent_requests <= 0:
            raise ValueError("Max concurrent requests must be positive")
        if self.checkpoint_interval <= 0:
            raise ValueError("Checkpoint interval must be positive")


@dataclass
class LoggingConfig:
    """Configuration for logging."""
    log_level: LogLevel = LogLevel.INFO
    log_to_file: bool = True
    log_file_path: str = "scale_cleanup.log"
    log_to_console: bool = True
    max_log_file_size_mb: int = 10
    backup_count: int = 5
    
    def __post_init__(self):
        """Validate configuration."""
        if self.log_to_file and not self.log_file_path.strip():
            raise ValueError("Log file path cannot be empty when logging to file")
        if self.max_log_file_size_mb <= 0:
            raise ValueError("Max log file size must be positive")
        if self.backup_count < 0:
            raise ValueError("Backup count cannot be negative")


@dataclass
class DatabaseConfig:
    """Configuration for database operations."""
    database_file_path: str = "../music-theory-engine.js"
    backup_directory: str = "./backups"
    create_backups: bool = True
    validate_after_modification: bool = True
    
    def __post_init__(self):
        """Validate configuration."""
        if not self.database_file_path.strip():
            raise ValueError("Database file path cannot be empty")
        if self.create_backups and not self.backup_directory.strip():
            raise ValueError("Backup directory cannot be empty when backups are enabled")


@dataclass
class ReportingConfig:
    """Configuration for reporting."""
    generate_json_reports: bool = True
    generate_markdown_reports: bool = True
    report_directory: str = "./reports"
    include_detailed_statistics: bool = True
    include_removal_details: bool = True
    
    def __post_init__(self):
        """Validate configuration."""
        if not self.report_directory.strip():
            raise ValueError("Report directory cannot be empty")


@dataclass
class SystemConfig:
    """Main system configuration."""
    search_engines: List[SearchEngineConfig] = field(default_factory=list)
    quality_thresholds: QualityThresholds = field(default_factory=QualityThresholds)
    removal_criteria: RemovalCriteria = field(default_factory=RemovalCriteria)
    fair_use: FairUseConfig = field(default_factory=FairUseConfig)
    batch_processing: BatchProcessingConfig = field(default_factory=BatchProcessingConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    reporting: ReportingConfig = field(default_factory=ReportingConfig)
    
    # Search configuration
    search_terms_templates: List[str] = field(default_factory=lambda: [
        '"{scale_name}" musical scale',
        '"{scale_name}" music theory',
        '"{scale_name}" scale notes intervals',
        '"{scale_name}" ethnomusicology'
    ])
    
    # Cultural context search terms
    cultural_search_terms: Dict[str, List[str]] = field(default_factory=dict)
    
    # Alternative names for scales
    scale_alternative_names: Dict[str, List[str]] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate configuration and set defaults."""
        if not self.search_engines:
            # Set default search engines
            self.search_engines = [
                SearchEngineConfig(
                    name="google",
                    api_key=os.getenv("GOOGLE_API_KEY", ""),
                    api_endpoint="https://www.googleapis.com/customsearch/v1"
                ),
                SearchEngineConfig(
                    name="bing",
                    api_key=os.getenv("BING_API_KEY", ""),
                    api_endpoint="https://api.bing.microsoft.com/v7.0/search"
                ),
                SearchEngineConfig(
                    name="duckduckgo",
                    enabled=True,
                    api_endpoint="https://duckduckgo.com/html/"
                )
            ]
        
        # Validate search terms templates
        if not self.search_terms_templates:
            raise ValueError("Search terms templates cannot be empty")
        
        for template in self.search_terms_templates:
            if "{scale_name}" not in template:
                raise ValueError(f"Search template must contain {{scale_name}} placeholder: {template}")
    
    def get_search_terms_for_scale(self, scale_name: str, cultural_context: str = "") -> List[str]:
        """Generate search terms for a specific scale."""
        terms = []
        
        # Basic search terms
        for template in self.search_terms_templates:
            terms.append(template.format(scale_name=scale_name))
        
        # Cultural context terms
        if cultural_context and cultural_context in self.cultural_search_terms:
            for cultural_term in self.cultural_search_terms[cultural_context]:
                terms.append(f'"{scale_name}" {cultural_term}')
        
        # Alternative names
        if scale_name in self.scale_alternative_names:
            for alt_name in self.scale_alternative_names[scale_name]:
                for template in self.search_terms_templates[:2]:  # Use first 2 templates
                    terms.append(template.format(scale_name=alt_name))
        
        return terms
    
    def validate_configuration(self) -> List[str]:
        """Validate the entire configuration and return any issues."""
        issues = []
        
        # Check if at least one search engine is enabled
        enabled_engines = [engine for engine in self.search_engines if engine.enabled]
        if not enabled_engines:
            issues.append("At least one search engine must be enabled")
        
        # Check API keys for enabled engines that require them
        for engine in enabled_engines:
            if engine.name in ["google", "bing"] and not engine.api_key:
                issues.append(f"API key required for {engine.name} search engine")
        
        # Validate directory paths exist or can be created
        directories_to_check = [
            self.database.backup_directory,
            self.reporting.report_directory
        ]
        
        for directory in directories_to_check:
            if directory and not os.path.exists(directory):
                try:
                    os.makedirs(directory, exist_ok=True)
                except OSError as e:
                    issues.append(f"Cannot create directory {directory}: {e}")
        
        return issues


def load_config_from_file(config_path: str) -> SystemConfig:
    """Load configuration from a YAML file."""
    import yaml
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = yaml.safe_load(f)
        
        # Create default config and update with loaded data
        config = create_default_config()
        
        # Handle search engines
        if 'search_engines' in config_data:
            search_engines = []
            for engine_data in config_data['search_engines']:
                search_engines.append(SearchEngineConfig(**engine_data))
            config.search_engines = search_engines
        
        # Handle search terms templates
        if 'search_terms_templates' in config_data:
            config.search_terms_templates = config_data['search_terms_templates']
        
        # Handle other configuration sections
        if 'quality_thresholds' in config_data:
            config.quality_thresholds = QualityThresholds(**config_data['quality_thresholds'])
        
        if 'removal_criteria' in config_data:
            config.removal_criteria = RemovalCriteria(**config_data['removal_criteria'])
        
        if 'fair_use' in config_data:
            config.fair_use = FairUseConfig(**config_data['fair_use'])
        
        if 'batch_processing' in config_data:
            config.batch_processing = BatchProcessingConfig(**config_data['batch_processing'])
        
        if 'logging' in config_data:
            config.logging = LoggingConfig(**config_data['logging'])
        
        if 'database' in config_data:
            config.database = DatabaseConfig(**config_data['database'])
        
        if 'reporting' in config_data:
            config.reporting = ReportingConfig(**config_data['reporting'])
        
        return config
    
    except FileNotFoundError:
        raise ValueError(f"Configuration file not found: {config_path}")
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in configuration file: {e}")
    except Exception as e:
        raise ValueError(f"Error loading configuration: {e}")


def create_default_config() -> SystemConfig:
    """Create a default system configuration."""
    config = SystemConfig()
    
    # Add some default cultural search terms
    config.cultural_search_terms = {
        "indian": ["raga", "hindustani", "carnatic", "indian classical"],
        "arabic": ["maqam", "arabic music", "middle eastern"],
        "chinese": ["pentatonic", "chinese traditional", "guqin"],
        "japanese": ["gagaku", "japanese traditional", "koto"],
        "western": ["classical", "jazz", "blues", "folk"]
    }
    
    # Add some common alternative names
    config.scale_alternative_names = {
        "major": ["ionian", "diatonic major"],
        "minor": ["natural minor", "aeolian"],
        "dorian": ["dorian mode"],
        "mixolydian": ["mixolydian mode"],
        "pentatonic": ["pentatonic scale", "five-note scale"]
    }
    
    return config