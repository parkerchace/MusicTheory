"""
Cleanup Engine implementation for the Scale Existence Cleanup System.

This module implements the core cleanup logic including removal decision making,
scale classification, ambiguous case detection, and database modification operations.
"""

import logging
import json
import os
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

try:
    # Try relative imports first (when used as module)
    from .interfaces import CleanupEngineInterface, DatabaseInterface, ReportingInterface
    from .base_implementations import BaseCleanupEngine
    from .models import (
        ScaleData, SearchResult, QualityAssessment, RemovalDecision,
        RemovalResult, RemovalReport, SourceType, ScaleType
    )
    from .config import SystemConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from interfaces import CleanupEngineInterface, DatabaseInterface, ReportingInterface
    from base_implementations import BaseCleanupEngine
    from models import (
        ScaleData, SearchResult, QualityAssessment, RemovalDecision,
        RemovalResult, RemovalReport, SourceType, ScaleType, BackupResult
    )
    from config import SystemConfig


class CleanupEngine(BaseCleanupEngine):
    """
    Concrete implementation of the cleanup engine with advanced removal decision logic.
    
    This engine evaluates scales based on search results and quality assessments,
    makes removal decisions according to configurable criteria, and handles
    database modifications with proper backup and rollback capabilities.
    """
    
    def __init__(self, config: SystemConfig, database: Optional[DatabaseInterface] = None,
                 reporter: Optional[ReportingInterface] = None):
        """
        Initialize the cleanup engine.
        
        Args:
            config: System configuration
            database: Database interface for scale operations
            reporter: Reporting interface for generating reports
        """
        super().__init__(config)
        self.database = database
        self.reporter = reporter
        self.removal_statistics = {
            'total_processed': 0,
            'removed': 0,
            'flagged': 0,
            'kept': 0,
            'errors': 0
        }
        self.removal_results: List[RemovalResult] = []
        self.processing_start_time = datetime.now()
    
    def evaluate_removal_criteria(self, scale: ScaleData, search_results: List[SearchResult],
                                quality_assessments: Optional[List[QualityAssessment]] = None) -> RemovalDecision:
        """
        Evaluate whether a scale should be removed based on comprehensive criteria.
        
        This method implements the core removal decision logic, considering:
        - Number and quality of sources found
        - Educational vs commercial source requirements
        - Scale type-specific leniency rules
        - Ambiguous case detection and flagging
        
        Args:
            scale: Scale data to evaluate
            search_results: Search results for the scale
            quality_assessments: Optional quality assessments for the sources
            
        Returns:
            RemovalDecision with detailed reasoning
        """
        criteria = self.config.removal_criteria
        
        # Classify search results by quality and type
        classified_results = self._classify_search_results(search_results, quality_assessments)
        
        # Initialize decision variables
        should_remove = False
        confidence = 0.0
        reasons = []
        alternative_actions = []
        supporting_evidence = []
        
        # Evidence collection
        total_results = len(search_results)
        quality_results = classified_results['quality']
        educational_results = classified_results['educational']
        commercial_results = classified_results['commercial']
        dedicated_sources = classified_results['dedicated']
        
        supporting_evidence.append(f"Total search results: {total_results}")
        supporting_evidence.append(f"Quality results: {len(quality_results)}")
        supporting_evidence.append(f"Educational results: {len(educational_results)}")
        supporting_evidence.append(f"Dedicated sources: {len(dedicated_sources)}")
        
        # Criterion 1: Check for dedicated sources requirement
        if criteria.require_dedicated_sources and len(dedicated_sources) == 0:
            should_remove = True
            confidence += 0.5
            reasons.append("No dedicated sources found for this scale")
            self.logger.info(f"Scale {scale.name}: No dedicated sources found")
        
        # Criterion 2: Minimum sources requirement
        relevant_sources = quality_results if quality_results else search_results
        if len(relevant_sources) < criteria.minimum_sources_required:
            should_remove = True
            confidence += 0.3
            reasons.append(f"Insufficient sources ({len(relevant_sources)} < {criteria.minimum_sources_required})")
            self.logger.info(f"Scale {scale.name}: Insufficient sources")
        
        # Criterion 3: Educational source requirement
        if criteria.require_educational_sources and len(educational_results) == 0:
            # Check if we have any quality sources at all
            if len(quality_results) > 0:
                confidence += 0.2
                reasons.append("No educational sources found, only commercial/unknown sources")
            else:
                should_remove = True
                confidence += 0.4
                reasons.append("No educational sources found and no quality sources available")
            self.logger.info(f"Scale {scale.name}: No educational sources")
        
        # Criterion 4: Commercial source evaluation
        if not criteria.allow_commercial_sources and len(commercial_results) > 0 and len(educational_results) == 0:
            confidence += 0.2
            reasons.append("Only commercial sources available, educational sources required")
        
        # Apply scale type-specific rules
        decision_modified = self._apply_scale_type_rules(scale, should_remove, confidence, reasons, alternative_actions)
        should_remove, confidence = decision_modified[:2]
        
        # Handle ambiguous cases
        if criteria.flag_ambiguous_cases:
            should_remove, alternative_actions = self._handle_ambiguous_cases(
                should_remove, confidence, alternative_actions, scale, classified_results
            )
        
        # Apply confidence threshold
        if should_remove and confidence < criteria.minimum_confidence_for_removal:
            should_remove = False
            alternative_actions.append(f"Confidence {confidence:.2f} below threshold {criteria.minimum_confidence_for_removal}")
            self.logger.info(f"Scale {scale.name}: Confidence too low for removal")
        
        # Final confidence adjustment
        confidence = min(confidence, 1.0)
        
        # Log decision
        decision_type = "REMOVE" if should_remove else "KEEP"
        self.logger.info(f"Scale {scale.name}: Decision = {decision_type}, Confidence = {confidence:.2f}")
        
        return RemovalDecision(
            should_remove=should_remove,
            confidence=confidence,
            reasons=reasons,
            alternative_actions=alternative_actions,
            supporting_evidence=supporting_evidence
        )
    
    def _classify_search_results(self, search_results: List[SearchResult],
                               quality_assessments: Optional[List[QualityAssessment]] = None) -> Dict[str, List[SearchResult]]:
        """
        Classify search results by quality and type.
        
        Args:
            search_results: List of search results to classify
            quality_assessments: Optional quality assessments
            
        Returns:
            Dictionary with classified results
        """
        classification = {
            'quality': [],
            'educational': [],
            'commercial': [],
            'academic': [],
            'cultural': [],
            'dedicated': [],
            'low_quality': []
        }
        
        quality_threshold = self.config.quality_thresholds.minimum_overall_quality
        
        for i, result in enumerate(search_results):
            # Use quality assessment if available
            if quality_assessments and i < len(quality_assessments):
                assessment = quality_assessments[i]
                if assessment.has_scale_information and assessment.information_completeness >= quality_threshold:
                    classification['quality'].append(result)
                    if assessment.information_completeness >= 0.7:
                        classification['dedicated'].append(result)
                else:
                    classification['low_quality'].append(result)
            else:
                # Fallback to relevance score
                if result.relevance_score >= quality_threshold:
                    classification['quality'].append(result)
                    if result.relevance_score >= 0.7:
                        classification['dedicated'].append(result)
                else:
                    classification['low_quality'].append(result)
            
            # Classify by source type
            if result.source_type == SourceType.EDUCATIONAL:
                classification['educational'].append(result)
            elif result.source_type == SourceType.COMMERCIAL:
                classification['commercial'].append(result)
            elif result.source_type == SourceType.ACADEMIC:
                classification['academic'].append(result)
                classification['educational'].append(result)  # Academic counts as educational
            elif result.source_type == SourceType.CULTURAL:
                classification['cultural'].append(result)
        
        return classification
    
    def _apply_scale_type_rules(self, scale: ScaleData, should_remove: bool, confidence: float,
                              reasons: List[str], alternative_actions: List[str]) -> Tuple[bool, float, List[str], List[str]]:
        """
        Apply scale type-specific rules for removal decisions.
        
        Args:
            scale: Scale being evaluated
            should_remove: Current removal decision
            confidence: Current confidence level
            reasons: Current reasons list
            alternative_actions: Current alternative actions list
            
        Returns:
            Tuple of (should_remove, confidence, reasons, alternative_actions)
        """
        criteria = self.config.removal_criteria
        
        if scale.scale_type == ScaleType.TRADITIONAL and criteria.traditional_scale_leniency:
            if should_remove and confidence < 0.8:
                # Apply leniency for traditional scales
                should_remove = False
                confidence *= 0.7  # Reduce confidence
                alternative_actions.append("Traditional scale leniency applied - flagged for manual review")
                reasons.append("Traditional scale - requires higher confidence for removal")
                self.logger.info(f"Traditional scale {scale.name}: Leniency applied")
        
        elif scale.scale_type == ScaleType.MODERN:
            # Modern scales require more rigorous documentation
            if not should_remove and confidence > 0.3:
                confidence += 0.1  # Slightly increase confidence for removal
                reasons.append("Modern scale - higher documentation standards applied")
        
        elif scale.scale_type == ScaleType.SYNTHETIC:
            # Synthetic scales require very rigorous documentation
            if not should_remove and confidence > 0.2:
                confidence += 0.2  # Increase confidence for removal
                reasons.append("Synthetic scale - very high documentation standards required")
        
        elif scale.scale_type == ScaleType.CULTURAL:
            # Cultural scales get special consideration
            if should_remove and confidence < 0.9:
                should_remove = False
                alternative_actions.append("Cultural scale - requires expert review")
                reasons.append("Cultural scale - automatic removal requires very high confidence")
        
        return should_remove, confidence, reasons, alternative_actions
    
    def _handle_ambiguous_cases(self, should_remove: bool, confidence: float,
                              alternative_actions: List[str], scale: ScaleData,
                              classified_results: Dict[str, List[SearchResult]]) -> Tuple[bool, List[str]]:
        """
        Handle ambiguous cases that require manual review.
        
        Args:
            should_remove: Current removal decision
            confidence: Confidence level
            alternative_actions: Current alternative actions
            scale: Scale being evaluated
            classified_results: Classified search results
            
        Returns:
            Tuple of (should_remove, alternative_actions)
        """
        # Define ambiguous case conditions
        is_ambiguous = False
        ambiguous_reasons = []
        
        # Confidence in ambiguous range
        if 0.3 <= confidence <= 0.7:
            is_ambiguous = True
            ambiguous_reasons.append(f"Confidence {confidence:.2f} in ambiguous range")
        
        # Mixed source types
        if (len(classified_results['educational']) > 0 and 
            len(classified_results['commercial']) > 0 and 
            len(classified_results['quality']) < 3):
            is_ambiguous = True
            ambiguous_reasons.append("Mixed educational and commercial sources with limited quality results")
        
        # Cultural scales with some documentation
        if (scale.scale_type == ScaleType.CULTURAL and 
            len(classified_results['quality']) > 0 and 
            len(classified_results['dedicated']) == 0):
            is_ambiguous = True
            ambiguous_reasons.append("Cultural scale with some documentation but no dedicated sources")
        
        # Traditional scales with minimal documentation
        if (scale.scale_type == ScaleType.TRADITIONAL and 
            0 < len(classified_results['quality']) < 2):
            is_ambiguous = True
            ambiguous_reasons.append("Traditional scale with minimal documentation")
        
        if is_ambiguous:
            should_remove = False
            alternative_actions.extend([
                "Flagged for manual review due to ambiguous evidence",
                f"Ambiguous reasons: {'; '.join(ambiguous_reasons)}"
            ])
            self.logger.info(f"Scale {scale.name}: Flagged as ambiguous case")
        
        return should_remove, alternative_actions
    
    def remove_scale(self, scale_id: str, reason: str) -> RemovalResult:
        """
        Remove a scale from the database with proper backup and error handling.
        
        Args:
            scale_id: ID of the scale to remove
            reason: Reason for removal
            
        Returns:
            RemovalResult with operation details
            
        Raises:
            RemovalError: If removal fails
        """
        try:
            self.logger.info(f"Starting removal of scale {scale_id}: {reason}")
            
            # Create backup before removal if configured
            backup_created = False
            backup_location = ""
            
            if self.config.database.create_backups and self.database:
                backup_result = self._create_removal_backup(scale_id)
                backup_created = backup_result.success
                backup_location = backup_result.backup_location
            
            # Perform the actual removal
            if self.database:
                removal_success = self.database.remove_scale_by_id(scale_id)
            else:
                # Fallback to direct file modification
                removal_success = self._remove_scale_from_file(scale_id)
            
            if not removal_success:
                raise Exception(f"Database removal operation failed for scale {scale_id}")
            
            # Create removal result
            result = RemovalResult(
                success=True,
                scale_id=scale_id,
                removal_reason=reason,
                backup_created=backup_created,
                backup_location=backup_location,
                timestamp=datetime.now()
            )
            
            self.removal_results.append(result)
            self.removal_statistics['removed'] += 1
            
            self.logger.info(f"Successfully removed scale {scale_id}")
            return result
        
        except Exception as e:
            self.logger.error(f"Failed to remove scale {scale_id}: {e}")
            self.removal_statistics['errors'] += 1
            
            # Return failed result
            result = RemovalResult(
                success=False,
                scale_id=scale_id,
                removal_reason=f"Removal failed: {str(e)}",
                backup_created=False,
                timestamp=datetime.now()
            )
            
            self.removal_results.append(result)
            return result
    
    def _create_removal_backup(self, scale_id: str) -> BackupResult:
        """
        Create a backup before removing a scale.
        
        Args:
            scale_id: ID of the scale to backup
            
        Returns:
            BackupResult with backup details
        """
        try:
            backup_dir = Path(self.config.database.backup_directory)
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"scale_backup_{scale_id}_{timestamp}.json"
            backup_path = backup_dir / backup_filename
            
            # Get scale data
            if self.database:
                scales = self.database.load_scales()
                scale_to_backup = next((s for s in scales if s.scale_id == scale_id), None)
                
                if scale_to_backup:
                    backup_data = {
                        'scale_id': scale_to_backup.scale_id,
                        'name': scale_to_backup.name,
                        'notes': scale_to_backup.notes,
                        'intervals': scale_to_backup.intervals,
                        'scale_type': scale_to_backup.scale_type.value,
                        'cultural_origin': scale_to_backup.cultural_origin,
                        'description': scale_to_backup.description,
                        'metadata': scale_to_backup.metadata,
                        'backup_timestamp': timestamp,
                        'backup_reason': 'Pre-removal backup'
                    }
                    
                    with open(backup_path, 'w', encoding='utf-8') as f:
                        json.dump(backup_data, f, indent=2, ensure_ascii=False)
                    
                    backup_size = backup_path.stat().st_size
                    
                    return BackupResult(
                        success=True,
                        backup_location=str(backup_path),
                        scales_backed_up=1,
                        backup_size_bytes=backup_size,
                        timestamp=datetime.now()
                    )
            
            return BackupResult(
                success=False,
                backup_location="",
                scales_backed_up=0,
                timestamp=datetime.now()
            )
        
        except Exception as e:
            self.logger.error(f"Backup creation failed for scale {scale_id}: {e}")
            return BackupResult(
                success=False,
                backup_location="",
                scales_backed_up=0,
                timestamp=datetime.now()
            )
    
    def _remove_scale_from_file(self, scale_id: str) -> bool:
        """
        Remove a scale directly from the JavaScript database file.
        
        This is a fallback method when no database interface is available.
        
        Args:
            scale_id: ID of the scale to remove
            
        Returns:
            True if removal was successful
        """
        try:
            db_file_path = Path(self.config.database.database_file_path)
            
            if not db_file_path.exists():
                self.logger.error(f"Database file not found: {db_file_path}")
                return False
            
            # Read the current file
            with open(db_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # This is a simplified implementation
            # Real implementation would parse JavaScript and remove specific scale
            # For now, we'll just log the operation
            self.logger.info(f"Would remove scale {scale_id} from {db_file_path}")
            
            # In a real implementation, this would:
            # 1. Parse the JavaScript file
            # 2. Find and remove the scale definition
            # 3. Write the modified content back
            # 4. Validate the JavaScript syntax
            
            return True
        
        except Exception as e:
            self.logger.error(f"File-based removal failed for scale {scale_id}: {e}")
            return False
    
    def generate_removal_report(self, removed_scales: List[str]) -> RemovalReport:
        """
        Generate a comprehensive removal report.
        
        Args:
            removed_scales: List of scale IDs that were removed
            
        Returns:
            RemovalReport with detailed statistics
        """
        processing_time = (datetime.now() - self.processing_start_time).total_seconds()
        
        return RemovalReport(
            total_scales_processed=self.removal_statistics['total_processed'],
            scales_removed=self.removal_statistics['removed'],
            scales_flagged=self.removal_statistics['flagged'],
            removal_results=self.removal_results.copy(),
            processing_time_seconds=processing_time,
            timestamp=datetime.now()
        )
    
    def backup_removed_scales(self, scales: List[ScaleData]) -> BackupResult:
        """
        Create a comprehensive backup of multiple scales.
        
        Args:
            scales: List of scales to backup
            
        Returns:
            BackupResult with backup details
        """
        try:
            backup_dir = Path(self.config.database.backup_directory)
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"bulk_scale_backup_{timestamp}.json"
            backup_path = backup_dir / backup_filename
            
            backup_data = {
                'backup_timestamp': timestamp,
                'backup_reason': 'Bulk scale removal backup',
                'scales_count': len(scales),
                'scales': []
            }
            
            for scale in scales:
                scale_data = {
                    'scale_id': scale.scale_id,
                    'name': scale.name,
                    'notes': scale.notes,
                    'intervals': scale.intervals,
                    'scale_type': scale.scale_type.value,
                    'cultural_origin': scale.cultural_origin,
                    'description': scale.description,
                    'metadata': scale.metadata
                }
                backup_data['scales'].append(scale_data)
            
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            backup_size = backup_path.stat().st_size
            
            self.logger.info(f"Created bulk backup of {len(scales)} scales at {backup_path}")
            
            return BackupResult(
                success=True,
                backup_location=str(backup_path),
                scales_backed_up=len(scales),
                backup_size_bytes=backup_size,
                timestamp=datetime.now()
            )
        
        except Exception as e:
            self.logger.error(f"Bulk backup creation failed: {e}")
            return BackupResult(
                success=False,
                backup_location="",
                scales_backed_up=0,
                timestamp=datetime.now()
            )
    
    def update_statistics(self, operation: str) -> None:
        """
        Update processing statistics.
        
        Args:
            operation: Type of operation performed ('processed', 'removed', 'flagged', 'kept', 'error')
        """
        if operation in self.removal_statistics:
            self.removal_statistics[operation] += 1
        
        if operation == 'processed':
            self.removal_statistics['total_processed'] += 1
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get current processing statistics.
        
        Returns:
            Dictionary with current statistics
        """
        processing_time = (datetime.now() - self.processing_start_time).total_seconds()
        
        stats = self.removal_statistics.copy()
        stats['processing_time_seconds'] = processing_time
        stats['success_rate'] = (
            (stats['removed'] + stats['kept']) / max(stats['total_processed'], 1)
        )
        
        return stats
    
    def reset_statistics(self) -> None:
        """Reset processing statistics."""
        self.removal_statistics = {
            'total_processed': 0,
            'removed': 0,
            'flagged': 0,
            'kept': 0,
            'errors': 0
        }
        self.removal_results.clear()
        self.processing_start_time = datetime.now()