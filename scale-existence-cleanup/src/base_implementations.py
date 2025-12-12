"""
Base implementations and utility classes for the Scale Existence Cleanup System.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import time

try:
    # Try relative imports first (when used as module)
    from .interfaces import (
        SearchEngineInterface, QualityCheckerInterface, CleanupEngineInterface,
        FairUseComplianceInterface, DatabaseInterface, ReportingInterface,
        SearchEngineError, QualityCheckError, RemovalError, DatabaseError
    )
except ImportError:
    # Fall back to absolute imports (when run as script)
    from interfaces import (
        SearchEngineInterface, QualityCheckerInterface, CleanupEngineInterface,
        FairUseComplianceInterface, DatabaseInterface, ReportingInterface,
        SearchEngineError, QualityCheckError, RemovalError, DatabaseError
    )
try:
    # Try relative imports first (when used as module)
    from .models import (
        SearchResult, QualityAssessment, ScaleInformation, RemovalDecision,
        ScaleData, SearchStatistics, ComplianceResult, CompletenessScore,
        RemovalResult, RemovalReport, BackupResult, FairUseActivity,
        ComplianceReport, ComplianceCheck, SourceType
    )
except ImportError:
    # Fall back to absolute imports (when run as script)
    from models import (
        SearchResult, QualityAssessment, ScaleInformation, RemovalDecision,
        ScaleData, SearchStatistics, ComplianceResult, CompletenessScore,
        RemovalResult, RemovalReport, BackupResult, FairUseActivity,
        ComplianceReport, ComplianceCheck, SourceType
    )
try:
    # Try relative imports first (when used as module)
    from .config import SystemConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from config import SystemConfig


class BaseSearchEngine(SearchEngineInterface):
    """Base implementation for search engines with common functionality."""
    
    def __init__(self, config: SystemConfig, engine_name: str):
        """
        Initialize the base search engine.
        
        Args:
            config: System configuration
            engine_name: Name of the search engine
        """
        self.config = config
        self.engine_name = engine_name
        self.logger = logging.getLogger(f"{__name__}.{engine_name}")
        self.search_count = 0
        self.successful_searches = 0
        self.failed_searches = 0
        self.total_results = 0
        self.start_time = time.time()
        
        # Find engine config
        self.engine_config = None
        for engine in config.search_engines:
            if engine.name == engine_name:
                self.engine_config = engine
                break
        
        if not self.engine_config:
            raise SearchEngineError(f"No configuration found for search engine: {engine_name}")
    
    def search_scale(self, scale_name: str, cultural_context: str = None) -> List[SearchResult]:
        """Base implementation that generates search terms and delegates to _perform_search."""
        if not self.is_available():
            raise SearchEngineError(f"Search engine {self.engine_name} is not available")
        
        search_terms = self.config.get_search_terms_for_scale(scale_name, cultural_context or "")
        results = []
        
        for term in search_terms:
            try:
                term_results = self._perform_search(term)
                results.extend(term_results)
                self.successful_searches += 1
            except Exception as e:
                self.logger.warning(f"Search failed for term '{term}': {e}")
                self.failed_searches += 1
        
        self.search_count += 1
        self.total_results += len(results)
        
        # Evaluate relevance for all results
        for result in results:
            result.relevance_score = self.evaluate_search_relevance(result, scale_name)
        
        return results
    
    def search_with_alternatives(self, scale_name: str, alternatives: List[str]) -> List[SearchResult]:
        """Search using alternative names."""
        all_results = []
        
        # Search with primary name
        all_results.extend(self.search_scale(scale_name))
        
        # Search with alternatives
        for alt_name in alternatives:
            all_results.extend(self.search_scale(alt_name))
        
        # Remove duplicates based on URL
        unique_results = {}
        for result in all_results:
            if result.url not in unique_results:
                unique_results[result.url] = result
            else:
                # Keep the result with higher relevance score
                if result.relevance_score > unique_results[result.url].relevance_score:
                    unique_results[result.url] = result
        
        return list(unique_results.values())
    
    def evaluate_search_relevance(self, result: SearchResult, scale_name: str) -> float:
        """Basic relevance evaluation based on title and snippet content."""
        relevance = 0.0
        scale_name_lower = scale_name.lower()
        
        # Check title
        if scale_name_lower in result.title.lower():
            relevance += 0.4
        
        # Check snippet
        if scale_name_lower in result.snippet.lower():
            relevance += 0.3
        
        # Check for music-related terms
        music_terms = ['scale', 'music', 'theory', 'notes', 'intervals', 'chord']
        title_snippet = (result.title + " " + result.snippet).lower()
        
        for term in music_terms:
            if term in title_snippet:
                relevance += 0.1
                break
        
        # Bonus for educational sources
        if result.source_type == SourceType.EDUCATIONAL:
            relevance += 0.2
        elif result.source_type == SourceType.ACADEMIC:
            relevance += 0.3
        
        return min(relevance, 1.0)
    
    def get_search_statistics(self) -> SearchStatistics:
        """Get search statistics."""
        processing_time = time.time() - self.start_time
        avg_relevance = 0.0
        
        if self.total_results > 0:
            # This would need to be calculated from actual results in a real implementation
            avg_relevance = 0.5  # Placeholder
        
        return SearchStatistics(
            total_searches=self.search_count,
            successful_searches=self.successful_searches,
            failed_searches=self.failed_searches,
            total_results_found=self.total_results,
            average_relevance_score=avg_relevance,
            search_engines_used=[self.engine_name],
            processing_time_seconds=processing_time
        )
    
    def is_available(self) -> bool:
        """Check if search engine is available."""
        return self.engine_config.enabled
    
    def _perform_search(self, search_term: str) -> List[SearchResult]:
        """
        Perform the actual search - to be implemented by subclasses.
        
        Args:
            search_term: Term to search for
            
        Returns:
            List of search results
            
        Raises:
            SearchEngineError: If search fails
        """
        raise NotImplementedError("Subclasses must implement _perform_search")


class BaseQualityChecker(QualityCheckerInterface):
    """Base implementation for quality checkers."""
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the quality checker.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.QualityChecker")
    
    def evaluate_source_quality(self, url: str, scale_name: str) -> QualityAssessment:
        """Base implementation of source quality evaluation."""
        try:
            # This would fetch and analyze the content in a real implementation
            content = self._fetch_content(url)
            scale_info = self.extract_scale_information(content, scale_name)
            compliance = self.check_educational_compliance(url)
            completeness = self.assess_documentation_completeness(scale_info)
            
            # Calculate quality scores
            info_completeness = completeness.overall_score
            educational_value = 0.8 if compliance.is_compliant else 0.3
            source_authority = self._assess_source_authority(url)
            
            return QualityAssessment(
                has_scale_information=scale_info.notes or scale_info.intervals or scale_info.description,
                information_completeness=info_completeness,
                educational_value=educational_value,
                source_authority=source_authority,
                fair_use_compliant=compliance.is_compliant,
                extracted_information=scale_info,
                quality_issues=compliance.issues
            )
        
        except Exception as e:
            self.logger.error(f"Quality evaluation failed for {url}: {e}")
            raise QualityCheckError(f"Failed to evaluate source quality: {e}")
    
    def extract_scale_information(self, content: str, scale_name: str) -> ScaleInformation:
        """Basic implementation of scale information extraction."""
        # This is a simplified implementation
        # Real implementation would use NLP and music theory parsing
        
        has_notes = 'notes' in content.lower() or 'note' in content.lower()
        has_intervals = 'interval' in content.lower() or 'semitone' in content.lower()
        has_description = len(content) > 100
        has_examples = 'example' in content.lower() or 'chord' in content.lower()
        
        completeness = 0.0
        if has_notes:
            completeness += 0.3
        if has_intervals:
            completeness += 0.3
        if has_description:
            completeness += 0.2
        if has_examples:
            completeness += 0.2
        
        return ScaleInformation(
            scale_name=scale_name,
            notes=[],  # Would be extracted from content
            intervals=[],  # Would be extracted from content
            cultural_context="",  # Would be extracted from content
            description=content[:200] if has_description else "",
            musical_examples=has_examples,
            theoretical_explanation=has_description,
            completeness_score=completeness
        )
    
    def check_educational_compliance(self, source: str) -> ComplianceResult:
        """Check educational compliance."""
        educational_domains = ['.edu', '.org', 'wikipedia', 'britannica', 'theory', 'music']
        is_educational = any(domain in source.lower() for domain in educational_domains)
        
        return ComplianceResult(
            is_compliant=is_educational,
            compliance_score=0.8 if is_educational else 0.4,
            issues=[] if is_educational else ["Source may not be educational"],
            recommendations=["Verify educational purpose"] if not is_educational else []
        )
    
    def assess_documentation_completeness(self, info: ScaleInformation) -> CompletenessScore:
        """Assess documentation completeness."""
        has_notes = bool(info.notes)
        has_intervals = bool(info.intervals)
        has_description = bool(info.description.strip())
        has_examples = info.musical_examples
        has_cultural = bool(info.cultural_context.strip())
        
        score = 0.0
        if has_notes:
            score += 0.3
        if has_intervals:
            score += 0.3
        if has_description:
            score += 0.2
        if has_examples:
            score += 0.1
        if has_cultural:
            score += 0.1
        
        return CompletenessScore(
            overall_score=score,
            has_notes=has_notes,
            has_intervals=has_intervals,
            has_description=has_description,
            has_examples=has_examples,
            has_cultural_context=has_cultural
        )
    
    def _fetch_content(self, url: str) -> str:
        """Fetch content from URL - placeholder implementation."""
        # Real implementation would use requests and BeautifulSoup
        return f"Sample content for {url}"
    
    def _assess_source_authority(self, url: str) -> float:
        """Assess the authority of a source based on its URL."""
        authority_indicators = {
            '.edu': 0.9,
            '.org': 0.7,
            'wikipedia': 0.6,
            'britannica': 0.8,
            'jstor': 0.9,
            'scholar': 0.8
        }
        
        for indicator, score in authority_indicators.items():
            if indicator in url.lower():
                return score
        
        return 0.3  # Default for unknown sources


class BaseCleanupEngine(CleanupEngineInterface):
    """Base implementation for cleanup engines."""
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the cleanup engine.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.CleanupEngine")
    
    def evaluate_removal_criteria(self, scale: ScaleData, search_results: List[SearchResult]) -> RemovalDecision:
        """Evaluate whether a scale should be removed."""
        criteria = self.config.removal_criteria
        
        # Filter results by quality
        quality_results = [r for r in search_results if r.relevance_score >= 0.5]
        educational_results = [r for r in quality_results if r.source_type in [SourceType.EDUCATIONAL, SourceType.ACADEMIC]]
        
        should_remove = False
        confidence = 0.0
        reasons = []
        alternative_actions = []
        
        # Check if minimum sources requirement is met
        if len(quality_results) < criteria.minimum_sources_required:
            should_remove = True
            confidence += 0.4
            reasons.append(f"Insufficient quality sources found ({len(quality_results)} < {criteria.minimum_sources_required})")
        
        # Check educational source requirement
        if criteria.require_educational_sources and not educational_results:
            should_remove = True
            confidence += 0.3
            reasons.append("No educational sources found")
        
        # Apply leniency for traditional scales
        if criteria.traditional_scale_leniency and scale.scale_type.value == "traditional":
            if should_remove and confidence < 0.8:
                should_remove = False
                confidence = 0.3
                alternative_actions.append("Flag for manual review due to traditional scale leniency")
        
        # Flag ambiguous cases
        if criteria.flag_ambiguous_cases and 0.3 <= confidence <= 0.7:
            should_remove = False
            alternative_actions.append("Flag for manual review due to ambiguous evidence")
        
        # Apply confidence threshold
        if should_remove and confidence < criteria.minimum_confidence_for_removal:
            should_remove = False
            alternative_actions.append("Confidence too low for automatic removal")
        
        return RemovalDecision(
            should_remove=should_remove,
            confidence=min(confidence, 1.0),
            reasons=reasons,
            alternative_actions=alternative_actions,
            supporting_evidence=[f"Found {len(search_results)} total results, {len(quality_results)} quality results"]
        )
    
    def remove_scale(self, scale_id: str, reason: str) -> RemovalResult:
        """Remove a scale from the database."""
        try:
            # This would interact with the actual database in a real implementation
            self.logger.info(f"Removing scale {scale_id}: {reason}")
            
            return RemovalResult(
                success=True,
                scale_id=scale_id,
                removal_reason=reason,
                backup_created=True,
                backup_location=f"backup_{scale_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        
        except Exception as e:
            self.logger.error(f"Failed to remove scale {scale_id}: {e}")
            raise RemovalError(f"Scale removal failed: {e}")
    
    def generate_removal_report(self, removed_scales: List[str]) -> RemovalReport:
        """Generate a removal report."""
        return RemovalReport(
            total_scales_processed=len(removed_scales) + 100,  # Placeholder
            scales_removed=len(removed_scales),
            scales_flagged=10,  # Placeholder
            removal_results=[],  # Would be populated with actual results
            processing_time_seconds=300.0  # Placeholder
        )
    
    def backup_removed_scales(self, scales: List[ScaleData]) -> BackupResult:
        """Create backup of scales."""
        try:
            backup_location = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            # Would actually create backup file here
            
            return BackupResult(
                success=True,
                backup_location=backup_location,
                scales_backed_up=len(scales),
                backup_size_bytes=len(scales) * 1000  # Rough estimate
            )
        
        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            raise RemovalError(f"Backup operation failed: {e}")


def create_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Create a configured logger."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger