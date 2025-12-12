"""
Abstract base classes and interfaces for the Scale Existence Cleanup System.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    # Try relative imports first (when used as module)
    from .models import (
        SearchResult, QualityAssessment, ScaleInformation, RemovalDecision,
        RemovalReport, RemovalResult, ScaleData, SearchStatistics, SourceType,
        ComplianceResult, CompletenessScore, BackupResult, FairUseActivity,
        ComplianceReport, ComplianceCheck
    )
    from .config import SystemConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from models import (
        SearchResult, QualityAssessment, ScaleInformation, RemovalDecision,
        RemovalReport, RemovalResult, ScaleData, SearchStatistics, SourceType,
        ComplianceResult, CompletenessScore, BackupResult, FairUseActivity,
        ComplianceReport, ComplianceCheck
    )
    from config import SystemConfig


class SearchEngineInterface(ABC):
    """Abstract base class for search engines."""
    
    @abstractmethod
    def search_scale(self, scale_name: str, cultural_context: str = None) -> List[SearchResult]:
        """
        Search for information about a specific scale.
        
        Args:
            scale_name: Name of the scale to search for
            cultural_context: Optional cultural context for the scale
            
        Returns:
            List of search results
            
        Raises:
            SearchEngineError: If search fails
        """
        pass
    
    @abstractmethod
    def search_with_alternatives(self, scale_name: str, alternatives: List[str]) -> List[SearchResult]:
        """
        Search using alternative names for a scale.
        
        Args:
            scale_name: Primary name of the scale
            alternatives: List of alternative names
            
        Returns:
            List of search results from all name variations
            
        Raises:
            SearchEngineError: If search fails
        """
        pass
    
    @abstractmethod
    def evaluate_search_relevance(self, result: SearchResult, scale_name: str) -> float:
        """
        Evaluate how relevant a search result is to the scale.
        
        Args:
            result: Search result to evaluate
            scale_name: Name of the scale being searched
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        pass
    
    @abstractmethod
    def get_search_statistics(self) -> SearchStatistics:
        """
        Get statistics about search operations.
        
        Returns:
            Search statistics object
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the search engine is available and configured.
        
        Returns:
            True if search engine is ready to use
        """
        pass


class QualityCheckerInterface(ABC):
    """Abstract base class for documentation quality checkers."""
    
    @abstractmethod
    def evaluate_source_quality(self, url: str, scale_name: str) -> QualityAssessment:
        """
        Evaluate the quality of a source for scale documentation.
        
        Args:
            url: URL of the source to evaluate
            scale_name: Name of the scale being documented
            
        Returns:
            Quality assessment of the source
            
        Raises:
            QualityCheckError: If evaluation fails
        """
        pass
    
    @abstractmethod
    def extract_scale_information(self, content: str, scale_name: str) -> ScaleInformation:
        """
        Extract scale information from web content.
        
        Args:
            content: HTML or text content to analyze
            scale_name: Name of the scale to extract information for
            
        Returns:
            Extracted scale information
            
        Raises:
            ExtractionError: If information extraction fails
        """
        pass
    
    @abstractmethod
    def check_educational_compliance(self, source: str) -> ComplianceResult:
        """
        Check if a source complies with educational fair use guidelines.
        
        Args:
            source: URL or content to check
            
        Returns:
            Compliance check result
        """
        pass
    
    @abstractmethod
    def assess_documentation_completeness(self, info: ScaleInformation) -> CompletenessScore:
        """
        Assess how complete the scale documentation is.
        
        Args:
            info: Scale information to assess
            
        Returns:
            Completeness score
        """
        pass


class CleanupEngineInterface(ABC):
    """Abstract base class for cleanup engines."""
    
    @abstractmethod
    def evaluate_removal_criteria(self, scale: ScaleData, search_results: List[SearchResult]) -> RemovalDecision:
        """
        Evaluate whether a scale should be removed based on search results.
        
        Args:
            scale: Scale data to evaluate
            search_results: Search results for the scale
            
        Returns:
            Removal decision
        """
        pass
    
    @abstractmethod
    def remove_scale(self, scale_id: str, reason: str) -> RemovalResult:
        """
        Remove a scale from the database.
        
        Args:
            scale_id: ID of the scale to remove
            reason: Reason for removal
            
        Returns:
            Result of the removal operation
            
        Raises:
            RemovalError: If removal fails
        """
        pass
    
    @abstractmethod
    def generate_removal_report(self, removed_scales: List[str]) -> RemovalReport:
        """
        Generate a report of removed scales.
        
        Args:
            removed_scales: List of scale IDs that were removed
            
        Returns:
            Removal report
        """
        pass
    
    @abstractmethod
    def backup_removed_scales(self, scales: List[ScaleData]) -> BackupResult:
        """
        Create a backup of scales before removal.
        
        Args:
            scales: List of scales to backup
            
        Returns:
            Backup operation result
            
        Raises:
            BackupError: If backup fails
        """
        pass


class FairUseComplianceInterface(ABC):
    """Abstract base class for fair use compliance managers."""
    
    @abstractmethod
    def validate_educational_purpose(self, operation: str) -> bool:
        """
        Validate that an operation serves an educational purpose.
        
        Args:
            operation: Description of the operation
            
        Returns:
            True if operation is for educational purposes
        """
        pass
    
    @abstractmethod
    def check_content_usage_limits(self, content: str) -> ComplianceCheck:
        """
        Check if content usage is within fair use limits.
        
        Args:
            content: Content to check
            
        Returns:
            Compliance check result
        """
        pass
    
    @abstractmethod
    def log_fair_use_activity(self, activity: FairUseActivity) -> None:
        """
        Log an activity for fair use compliance tracking.
        
        Args:
            activity: Activity to log
        """
        pass
    
    @abstractmethod
    def generate_compliance_report(self) -> ComplianceReport:
        """
        Generate a compliance report for audit purposes.
        
        Returns:
            Compliance report
        """
        pass


class DatabaseInterface(ABC):
    """Abstract base class for database operations."""
    
    @abstractmethod
    def load_scales(self) -> List[ScaleData]:
        """
        Load all scales from the database.
        
        Returns:
            List of scale data
            
        Raises:
            DatabaseError: If loading fails
        """
        pass
    
    @abstractmethod
    def save_scales(self, scales: List[ScaleData]) -> bool:
        """
        Save scales to the database.
        
        Args:
            scales: List of scales to save
            
        Returns:
            True if save was successful
            
        Raises:
            DatabaseError: If saving fails
        """
        pass
    
    @abstractmethod
    def remove_scale_by_id(self, scale_id: str) -> bool:
        """
        Remove a scale from the database by ID.
        
        Args:
            scale_id: ID of the scale to remove
            
        Returns:
            True if removal was successful
            
        Raises:
            DatabaseError: If removal fails
        """
        pass
    
    @abstractmethod
    def backup_database(self, backup_path: str) -> bool:
        """
        Create a backup of the database.
        
        Args:
            backup_path: Path where backup should be created
            
        Returns:
            True if backup was successful
            
        Raises:
            DatabaseError: If backup fails
        """
        pass
    
    @abstractmethod
    def validate_database_integrity(self) -> bool:
        """
        Validate the integrity of the database.
        
        Returns:
            True if database is valid
        """
        pass


class ReportingInterface(ABC):
    """Abstract base class for reporting systems."""
    
    @abstractmethod
    def generate_json_report(self, data: Dict[str, Any], output_path: str) -> bool:
        """
        Generate a JSON report.
        
        Args:
            data: Data to include in the report
            output_path: Path where report should be saved
            
        Returns:
            True if report was generated successfully
            
        Raises:
            ReportingError: If report generation fails
        """
        pass
    
    @abstractmethod
    def generate_markdown_report(self, data: Dict[str, Any], output_path: str) -> bool:
        """
        Generate a Markdown report.
        
        Args:
            data: Data to include in the report
            output_path: Path where report should be saved
            
        Returns:
            True if report was generated successfully
            
        Raises:
            ReportingError: If report generation fails
        """
        pass
    
    @abstractmethod
    def generate_summary_statistics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate summary statistics from data.
        
        Args:
            data: Data to analyze
            
        Returns:
            Dictionary of summary statistics
        """
        pass


# Custom Exception Classes
class ScaleExistenceCleanupError(Exception):
    """Base exception for Scale Existence Cleanup System."""
    pass


class SearchEngineError(ScaleExistenceCleanupError):
    """Exception raised by search engines."""
    pass


class QualityCheckError(ScaleExistenceCleanupError):
    """Exception raised during quality checking."""
    pass


class ExtractionError(ScaleExistenceCleanupError):
    """Exception raised during information extraction."""
    pass


class RemovalError(ScaleExistenceCleanupError):
    """Exception raised during scale removal."""
    pass


class BackupError(ScaleExistenceCleanupError):
    """Exception raised during backup operations."""
    pass


class DatabaseError(ScaleExistenceCleanupError):
    """Exception raised during database operations."""
    pass


class ReportingError(ScaleExistenceCleanupError):
    """Exception raised during report generation."""
    pass


class ConfigurationError(ScaleExistenceCleanupError):
    """Exception raised for configuration issues."""
    pass


# Utility Functions for Error Handling
def handle_search_error(func):
    """Decorator to handle search engine errors gracefully."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            raise SearchEngineError(f"Search operation failed: {str(e)}") from e
    return wrapper


def handle_quality_check_error(func):
    """Decorator to handle quality check errors gracefully."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            raise QualityCheckError(f"Quality check failed: {str(e)}") from e
    return wrapper


def handle_database_error(func):
    """Decorator to handle database errors gracefully."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            raise DatabaseError(f"Database operation failed: {str(e)}") from e
    return wrapper


def validate_config(config: SystemConfig) -> None:
    """
    Validate system configuration and raise ConfigurationError if invalid.
    
    Args:
        config: System configuration to validate
        
    Raises:
        ConfigurationError: If configuration is invalid
    """
    issues = config.validate_configuration()
    if issues:
        raise ConfigurationError(f"Configuration validation failed: {'; '.join(issues)}")


def create_error_context(operation: str, **kwargs) -> Dict[str, Any]:
    """
    Create error context information for logging and debugging.
    
    Args:
        operation: Name of the operation that failed
        **kwargs: Additional context information
        
    Returns:
        Dictionary containing error context
    """
    context = {
        'operation': operation,
        'timestamp': datetime.now().isoformat(),
        'context': kwargs
    }
    return context