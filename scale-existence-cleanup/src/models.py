"""
Core data model classes for the Scale Existence Cleanup System.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any
from enum import Enum


class SourceType(Enum):
    """Types of sources found during search."""
    EDUCATIONAL = "educational"
    COMMERCIAL = "commercial"
    ACADEMIC = "academic"
    CULTURAL = "cultural"
    UNKNOWN = "unknown"


class ScaleType(Enum):
    """Types of scales for different validation standards."""
    TRADITIONAL = "traditional"
    MODERN = "modern"
    SYNTHETIC = "synthetic"
    CULTURAL = "cultural"


@dataclass
class SearchResult:
    """Represents a search result from internet search engines."""
    url: str
    title: str
    snippet: str
    relevance_score: float
    source_type: SourceType
    search_engine: str
    found_at: datetime
    content_preview: str = ""
    
    def __post_init__(self):
        """Validate data integrity."""
        if not self.url or not self.url.startswith(('http://', 'https://')):
            raise ValueError("URL must be a valid HTTP/HTTPS URL")
        if not 0.0 <= self.relevance_score <= 1.0:
            raise ValueError("Relevance score must be between 0.0 and 1.0")
        if not self.title.strip():
            raise ValueError("Title cannot be empty")


@dataclass
class ScaleInformation:
    """Information extracted about a musical scale."""
    scale_name: str
    notes: List[str] = field(default_factory=list)
    intervals: List[int] = field(default_factory=list)
    cultural_context: str = ""
    description: str = ""
    musical_examples: bool = False
    theoretical_explanation: bool = False
    completeness_score: float = 0.0
    
    def __post_init__(self):
        """Validate data integrity."""
        if not self.scale_name.strip():
            raise ValueError("Scale name cannot be empty")
        if not 0.0 <= self.completeness_score <= 1.0:
            raise ValueError("Completeness score must be between 0.0 and 1.0")
        # Validate intervals are positive
        if self.intervals and any(interval <= 0 for interval in self.intervals):
            raise ValueError("All intervals must be positive")


@dataclass
class QualityAssessment:
    """Assessment of documentation quality for a scale source."""
    has_scale_information: bool
    information_completeness: float  # 0.0 to 1.0
    educational_value: float  # 0.0 to 1.0
    source_authority: float  # 0.0 to 1.0
    fair_use_compliant: bool
    extracted_information: ScaleInformation
    quality_issues: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate data integrity."""
        for score_name, score in [
            ("information_completeness", self.information_completeness),
            ("educational_value", self.educational_value),
            ("source_authority", self.source_authority)
        ]:
            if not 0.0 <= score <= 1.0:
                raise ValueError(f"{score_name} must be between 0.0 and 1.0")


@dataclass
class RemovalDecision:
    """Decision about whether to remove a scale from the database."""
    should_remove: bool
    confidence: float  # 0.0 to 1.0
    reasons: List[str] = field(default_factory=list)
    alternative_actions: List[str] = field(default_factory=list)
    supporting_evidence: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate data integrity."""
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("Confidence must be between 0.0 and 1.0")
        if self.should_remove and not self.reasons:
            raise ValueError("Removal decision must have at least one reason")


@dataclass
class ScaleData:
    """Represents a scale in the database."""
    scale_id: str
    name: str
    notes: List[str]
    intervals: List[int]
    scale_type: ScaleType
    cultural_origin: str = ""
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate data integrity."""
        if not self.scale_id.strip():
            raise ValueError("Scale ID cannot be empty")
        if not self.name.strip():
            raise ValueError("Scale name cannot be empty")
        if not self.notes:
            raise ValueError("Scale must have at least one note")
        if not self.intervals:
            raise ValueError("Scale must have at least one interval")


@dataclass
class SearchStatistics:
    """Statistics about search operations."""
    total_searches: int = 0
    successful_searches: int = 0
    failed_searches: int = 0
    total_results_found: int = 0
    average_relevance_score: float = 0.0
    search_engines_used: List[str] = field(default_factory=list)
    processing_time_seconds: float = 0.0
    
    def __post_init__(self):
        """Validate data integrity."""
        if self.total_searches < 0:
            raise ValueError("Total searches cannot be negative")
        if self.successful_searches < 0:
            raise ValueError("Successful searches cannot be negative")
        if self.failed_searches < 0:
            raise ValueError("Failed searches cannot be negative")
        if self.processing_time_seconds < 0:
            raise ValueError("Processing time cannot be negative")


@dataclass
class ComplianceResult:
    """Result of fair use compliance check."""
    is_compliant: bool
    compliance_score: float  # 0.0 to 1.0
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate data integrity."""
        if not 0.0 <= self.compliance_score <= 1.0:
            raise ValueError("Compliance score must be between 0.0 and 1.0")


@dataclass
class CompletenessScore:
    """Score representing documentation completeness."""
    overall_score: float  # 0.0 to 1.0
    has_notes: bool = False
    has_intervals: bool = False
    has_description: bool = False
    has_examples: bool = False
    has_cultural_context: bool = False
    
    def __post_init__(self):
        """Validate data integrity."""
        if not 0.0 <= self.overall_score <= 1.0:
            raise ValueError("Overall score must be between 0.0 and 1.0")


@dataclass
class RemovalResult:
    """Result of a scale removal operation."""
    success: bool
    scale_id: str
    removal_reason: str
    backup_created: bool = False
    backup_location: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate data integrity."""
        if not self.scale_id.strip():
            raise ValueError("Scale ID cannot be empty")
        if self.success and not self.removal_reason.strip():
            raise ValueError("Successful removal must have a reason")


@dataclass
class RemovalReport:
    """Report of scales removed during cleanup."""
    total_scales_processed: int
    scales_removed: int
    scales_flagged: int
    removal_results: List[RemovalResult] = field(default_factory=list)
    processing_time_seconds: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate data integrity."""
        if self.total_scales_processed < 0:
            raise ValueError("Total scales processed cannot be negative")
        if self.scales_removed < 0:
            raise ValueError("Scales removed cannot be negative")
        if self.scales_flagged < 0:
            raise ValueError("Scales flagged cannot be negative")
        if self.processing_time_seconds < 0:
            raise ValueError("Processing time cannot be negative")


@dataclass
class BackupResult:
    """Result of a backup operation."""
    success: bool
    backup_location: str
    scales_backed_up: int
    backup_size_bytes: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate data integrity."""
        if self.success and not self.backup_location.strip():
            raise ValueError("Successful backup must have a location")
        if self.scales_backed_up < 0:
            raise ValueError("Scales backed up cannot be negative")
        if self.backup_size_bytes < 0:
            raise ValueError("Backup size cannot be negative")


@dataclass
class FairUseActivity:
    """Activity logged for fair use compliance."""
    activity_type: str
    url: str
    content_accessed: bool
    educational_purpose: str
    timestamp: datetime = field(default_factory=datetime.now)
    content_length: int = 0
    
    def __post_init__(self):
        """Validate data integrity."""
        if not self.activity_type.strip():
            raise ValueError("Activity type cannot be empty")
        if not self.url or not self.url.startswith(('http://', 'https://')):
            raise ValueError("URL must be a valid HTTP/HTTPS URL")
        if not self.educational_purpose.strip():
            raise ValueError("Educational purpose cannot be empty")
        if self.content_length < 0:
            raise ValueError("Content length cannot be negative")


@dataclass
class ComplianceReport:
    """Report of fair use compliance activities."""
    total_activities: int
    compliant_activities: int
    non_compliant_activities: int
    activities: List[FairUseActivity] = field(default_factory=list)
    report_period_start: datetime = field(default_factory=datetime.now)
    report_period_end: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate data integrity."""
        if self.total_activities < 0:
            raise ValueError("Total activities cannot be negative")
        if self.compliant_activities < 0:
            raise ValueError("Compliant activities cannot be negative")
        if self.non_compliant_activities < 0:
            raise ValueError("Non-compliant activities cannot be negative")
        if self.report_period_start > self.report_period_end:
            raise ValueError("Report period start must be before end")


@dataclass
class ComplianceCheck:
    """Result of checking content usage limits."""
    within_limits: bool
    content_length: int
    limit_threshold: int
    usage_percentage: float
    recommendations: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate data integrity."""
        if self.content_length < 0:
            raise ValueError("Content length cannot be negative")
        if self.limit_threshold <= 0:
            raise ValueError("Limit threshold must be positive")
        if not 0.0 <= self.usage_percentage <= 100.0:
            raise ValueError("Usage percentage must be between 0.0 and 100.0")