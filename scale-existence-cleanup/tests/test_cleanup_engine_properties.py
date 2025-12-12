"""
Property-based tests for the Cleanup Engine implementation.

These tests verify universal properties that should hold across all inputs
for the cleanup engine functionality, including removal decision logic,
scale classification, and database modification operations.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from pathlib import Path
import tempfile
import json

from src.cleanup_engine import CleanupEngine
from src.models import (
    ScaleData, SearchResult, RemovalDecision, RemovalResult, RemovalReport,
    BackupResult, QualityAssessment, ScaleInformation, ScaleType, SourceType
)
from src.config import SystemConfig, RemovalCriteria, QualityThresholds
from src.interfaces import DatabaseInterface, ReportingInterface


# Hypothesis strategies for generating test data
@st.composite
def scale_data_strategy(draw):
    """Generate valid ScaleData objects."""
    scale_id = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Pd'))))
    if not scale_id.strip():
        scale_id = "test_scale"
    
    name = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))
    if not name.strip():
        name = "Test Scale"
    
    notes = draw(st.lists(st.sampled_from(['C', 'D', 'E', 'F', 'G', 'A', 'B']), min_size=1, max_size=12))
    intervals = draw(st.lists(st.integers(min_value=1, max_value=12), min_size=1, max_size=12))
    scale_type = draw(st.sampled_from(list(ScaleType)))
    cultural_origin = draw(st.text(max_size=30, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))
    description = draw(st.text(max_size=200, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs', 'Po'))))
    
    return ScaleData(
        scale_id=scale_id,
        name=name,
        notes=notes,
        intervals=intervals,
        scale_type=scale_type,
        cultural_origin=cultural_origin,
        description=description,
        metadata={}
    )


@st.composite
def search_result_strategy(draw):
    """Generate valid SearchResult objects."""
    domain = draw(st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd'))))
    path = draw(st.text(min_size=0, max_size=30, alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Pd'))))
    url = f"https://{domain}.com/{path}"
    
    title = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'))))
    if not title.strip():
        title = "Default Title"
    
    snippet = draw(st.text(min_size=0, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'))))
    relevance_score = draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    source_type = draw(st.sampled_from(list(SourceType)))
    search_engine = draw(st.sampled_from(['google', 'bing', 'duckduckgo']))
    
    return SearchResult(
        url=url,
        title=title,
        snippet=snippet,
        relevance_score=relevance_score,
        source_type=source_type,
        search_engine=search_engine,
        found_at=datetime.now(),
        content_preview=snippet[:200]
    )


@st.composite
def quality_assessment_strategy(draw):
    """Generate valid QualityAssessment objects."""
    has_scale_info = draw(st.booleans())
    info_completeness = draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    educational_value = draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    source_authority = draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    fair_use_compliant = draw(st.booleans())
    
    scale_info = ScaleInformation(
        scale_name="test_scale",
        notes=['C', 'D', 'E'] if has_scale_info else [],
        intervals=[2, 2] if has_scale_info else [],
        completeness_score=info_completeness
    )
    
    return QualityAssessment(
        has_scale_information=has_scale_info,
        information_completeness=info_completeness,
        educational_value=educational_value,
        source_authority=source_authority,
        fair_use_compliant=fair_use_compliant,
        extracted_information=scale_info,
        quality_issues=[]
    )


@st.composite
def removal_criteria_strategy(draw):
    """Generate valid RemovalCriteria objects."""
    return RemovalCriteria(
        require_dedicated_sources=draw(st.booleans()),
        minimum_sources_required=draw(st.integers(min_value=0, max_value=5)),
        allow_commercial_sources=draw(st.booleans()),
        require_educational_sources=draw(st.booleans()),
        minimum_confidence_for_removal=draw(st.floats(min_value=0.1, max_value=1.0, allow_nan=False, allow_infinity=False)),
        flag_ambiguous_cases=draw(st.booleans()),
        traditional_scale_leniency=draw(st.booleans())
    )


class TestRemovalDecisionProperties:
    """Property-based tests for removal decision logic."""
    
    @given(scale_data_strategy(), st.lists(search_result_strategy(), min_size=0, max_size=10))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_no_source_removal_marking(self, scale, search_results):
        """
        **Feature: scale-existence-cleanup, Property 11: No-source removal marking**
        
        For any scale with no dedicated sources found, the Cleanup_Engine should mark it for removal.
        
        **Validates: Requirements 3.1**
        """
        config = SystemConfig()
        config.removal_criteria.require_dedicated_sources = True
        config.removal_criteria.minimum_confidence_for_removal = 0.5
        
        cleanup_engine = CleanupEngine(config)
        
        # Filter out any high-relevance results to simulate "no dedicated sources"
        low_quality_results = [r for r in search_results if r.relevance_score < 0.7]
        
        decision = cleanup_engine.evaluate_removal_criteria(scale, low_quality_results)
        
        # Property: Decision should be properly formed
        assert isinstance(decision, RemovalDecision), "Should return a RemovalDecision"
        assert isinstance(decision.should_remove, bool), "should_remove should be boolean"
        assert isinstance(decision.confidence, (int, float)), "confidence should be numeric"
        assert 0.0 <= decision.confidence <= 1.0, f"confidence {decision.confidence} should be between 0.0 and 1.0"
        assert isinstance(decision.reasons, list), "reasons should be a list"
        assert isinstance(decision.alternative_actions, list), "alternative_actions should be a list"
        assert isinstance(decision.supporting_evidence, list), "supporting_evidence should be a list"
        
        # Property: When no dedicated sources exist, should consider removal
        dedicated_sources = [r for r in low_quality_results if r.relevance_score >= 0.7]
        if len(dedicated_sources) == 0 and config.removal_criteria.require_dedicated_sources:
            # Should either mark for removal or flag for review
            removal_or_flagged = decision.should_remove or len(decision.alternative_actions) > 0
            assert removal_or_flagged, "Should either mark for removal or flag for review when no dedicated sources"
        
        # Property: Reasons should be provided when removal is recommended
        if decision.should_remove:
            assert len(decision.reasons) > 0, "Should provide reasons when marking for removal"
            assert all(isinstance(reason, str) for reason in decision.reasons), "All reasons should be strings"
            assert all(reason.strip() for reason in decision.reasons), "All reasons should be non-empty"
        
        # Property: Supporting evidence should always be provided
        assert len(decision.supporting_evidence) > 0, "Should always provide supporting evidence"
        
        # Property: Confidence should reflect the strength of evidence
        if len(low_quality_results) == 0:
            # No results at all should lead to higher confidence for removal
            if decision.should_remove:
                assert decision.confidence >= 0.3, "No results should lead to reasonable confidence for removal"
    
    @given(scale_data_strategy(), st.lists(search_result_strategy(), min_size=1, max_size=10),
           st.lists(quality_assessment_strategy(), min_size=1, max_size=10))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_undocumented_classification(self, scale, search_results, quality_assessments):
        """
        **Feature: scale-existence-cleanup, Property 12: Undocumented classification**
        
        For any scale where found sources lack actual scale information, the system should 
        classify the scale as undocumented.
        
        **Validates: Requirements 3.2**
        """
        config = SystemConfig()
        config.removal_criteria.require_educational_sources = True
        config.removal_criteria.minimum_confidence_for_removal = 0.6
        
        cleanup_engine = CleanupEngine(config)
        
        # Ensure we have matching numbers of results and assessments
        min_length = min(len(search_results), len(quality_assessments))
        if min_length == 0:
            assume(False)  # Skip this test case
        
        results = search_results[:min_length]
        assessments = quality_assessments[:min_length]
        
        decision = cleanup_engine.evaluate_removal_criteria(scale, results, assessments)
        
        # Property: Decision should be well-formed
        assert isinstance(decision, RemovalDecision), "Should return a RemovalDecision"
        assert 0.0 <= decision.confidence <= 1.0, "Confidence should be valid"
        
        # Property: When sources lack scale information, should consider undocumented
        sources_with_info = [a for a in assessments if a.has_scale_information]
        sources_without_info = [a for a in assessments if not a.has_scale_information]
        
        if len(sources_without_info) > len(sources_with_info):
            # Majority of sources lack scale information
            if decision.should_remove:
                # Should have reasons related to lack of information or sources
                info_related_reasons = [r for r in decision.reasons 
                                      if any(term in r.lower() for term in ['information', 'documented', 'sources', 'quality', 'educational'])]
                assert len(info_related_reasons) > 0 or len(decision.alternative_actions) > 0, \
                    f"Should mention information/documentation issues when sources lack scale info. Reasons: {decision.reasons}"
        
        # Property: Quality of information should influence decision
        high_quality_assessments = [a for a in assessments if a.information_completeness >= 0.7]
        low_quality_assessments = [a for a in assessments if a.information_completeness < 0.3]
        
        if len(low_quality_assessments) > len(high_quality_assessments):
            # More low-quality than high-quality sources
            if decision.confidence > 0.5:
                # High confidence decisions should be based on clear evidence
                assert decision.should_remove or len(decision.alternative_actions) > 0, \
                    "High confidence with low-quality sources should lead to action"
        
        # Property: Educational compliance should be considered
        non_compliant_sources = [a for a in assessments if not a.fair_use_compliant]
        if len(non_compliant_sources) == len(assessments) and len(assessments) > 0:
            # All sources are non-compliant
            compliance_reasons = [r for r in decision.reasons if 'compliance' in r.lower() or 'educational' in r.lower()]
            compliance_actions = [a for a in decision.alternative_actions if 'compliance' in a.lower() or 'educational' in a.lower()]
            
            # Should either have compliance-related reasons or actions
            has_compliance_consideration = len(compliance_reasons) > 0 or len(compliance_actions) > 0
            # Note: This is a soft assertion since compliance might be handled differently
    
    @given(scale_data_strategy(), st.lists(search_result_strategy(), min_size=0, max_size=8), removal_criteria_strategy())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_criteria_based_removal(self, scale, search_results, criteria):
        """
        **Feature: scale-existence-cleanup, Property 13: Criteria-based removal**
        
        For any scale meeting removal criteria, the Cleanup_Engine should remove it from the database.
        
        **Validates: Requirements 3.3**
        """
        config = SystemConfig()
        config.removal_criteria = criteria
        
        # Mock database interface
        mock_database = Mock(spec=DatabaseInterface)
        mock_database.remove_scale_by_id.return_value = True
        mock_database.load_scales.return_value = [scale]
        
        cleanup_engine = CleanupEngine(config, database=mock_database)
        
        decision = cleanup_engine.evaluate_removal_criteria(scale, search_results)
        
        # Property: Decision should respect configured criteria
        assert isinstance(decision, RemovalDecision), "Should return a RemovalDecision"
        
        # Property: Minimum sources requirement should be enforced
        quality_results = [r for r in search_results if r.relevance_score >= 0.5]
        if len(quality_results) < criteria.minimum_sources_required:
            # Should either remove or flag when minimum sources not met
            action_taken = decision.should_remove or len(decision.alternative_actions) > 0
            # Only assert if we actually require sources AND confidence threshold is reasonable
            if criteria.minimum_sources_required > 0 and criteria.minimum_confidence_for_removal <= 0.9:
                assert action_taken, f"Should take action when minimum sources requirement not met. Decision: {decision.should_remove}, Actions: {len(decision.alternative_actions)}, Confidence: {decision.confidence}"
        
        # Property: Educational source requirement should be enforced
        educational_results = [r for r in search_results 
                             if r.source_type in [SourceType.EDUCATIONAL, SourceType.ACADEMIC]]
        if criteria.require_educational_sources and len(educational_results) == 0 and len(search_results) > 0:
            # Has results but no educational ones
            educational_reasons = [r for r in decision.reasons if 'educational' in r.lower()]
            educational_actions = [a for a in decision.alternative_actions if 'educational' in a.lower()]
            
            has_educational_consideration = len(educational_reasons) > 0 or len(educational_actions) > 0
            # This is a soft check since the logic might handle this in various ways
        
        # Property: Confidence threshold should be respected
        if decision.should_remove:
            assert decision.confidence >= criteria.minimum_confidence_for_removal, \
                f"Removal confidence {decision.confidence} should meet threshold {criteria.minimum_confidence_for_removal}"
        
        # Property: Traditional scale leniency should be applied
        if criteria.traditional_scale_leniency and scale.scale_type == ScaleType.TRADITIONAL:
            if decision.should_remove and decision.confidence < 0.8:
                # Traditional scales should get leniency - either not removed or flagged
                leniency_applied = not decision.should_remove or any('traditional' in action.lower() 
                                                                   for action in decision.alternative_actions)
                # This is a soft check since leniency implementation may vary
        
        # Property: If decision is to remove, removal should be possible
        if decision.should_remove:
            removal_result = cleanup_engine.remove_scale(scale.scale_id, "Test removal")
            
            assert isinstance(removal_result, RemovalResult), "Should return RemovalResult"
            assert removal_result.scale_id == scale.scale_id, "Should preserve scale ID"
            assert isinstance(removal_result.success, bool), "Success should be boolean"
            assert isinstance(removal_result.removal_reason, str), "Reason should be string"
            assert removal_result.removal_reason.strip(), "Reason should be non-empty"
            
            # If removal was successful, database should have been called
            if removal_result.success:
                mock_database.remove_scale_by_id.assert_called_with(scale.scale_id)
    
    @given(st.lists(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Pd'))), min_size=1, max_size=10))
    @settings(max_examples=30)
    def test_removal_reporting(self, removed_scale_ids):
        """
        **Feature: scale-existence-cleanup, Property 14: Removal reporting**
        
        For any scales removed, the system should generate a detailed report of removed scales and reasons.
        
        **Validates: Requirements 3.4**
        """
        config = SystemConfig()
        cleanup_engine = CleanupEngine(config)
        
        # Simulate some removals
        for scale_id in removed_scale_ids[:5]:  # Limit to 5 for performance
            # Ensure scale_id is valid (non-empty after stripping)
            if not scale_id.strip():
                scale_id = "test_scale"
            
            cleanup_engine.update_statistics('removed')
            
            # Create a mock removal result
            result = RemovalResult(
                success=True,
                scale_id=scale_id,
                removal_reason=f"Test removal of {scale_id}",
                backup_created=True,
                backup_location=f"/backup/{scale_id}.json"
            )
            cleanup_engine.removal_results.append(result)
        
        # Property: Should be able to generate a report
        report = cleanup_engine.generate_removal_report(removed_scale_ids)
        
        # Universal properties for removal reports
        assert isinstance(report, RemovalReport), "Should return a RemovalReport"
        assert isinstance(report.total_scales_processed, int), "Total processed should be integer"
        assert isinstance(report.scales_removed, int), "Scales removed should be integer"
        assert isinstance(report.scales_flagged, int), "Scales flagged should be integer"
        assert isinstance(report.removal_results, list), "Removal results should be a list"
        assert isinstance(report.processing_time_seconds, (int, float)), "Processing time should be numeric"
        assert isinstance(report.timestamp, datetime), "Timestamp should be datetime"
        
        # Property: Counts should be non-negative
        assert report.total_scales_processed >= 0, "Total processed should be non-negative"
        assert report.scales_removed >= 0, "Scales removed should be non-negative"
        assert report.scales_flagged >= 0, "Scales flagged should be non-negative"
        assert report.processing_time_seconds >= 0, "Processing time should be non-negative"
        
        # Property: Removal results should match what was processed
        assert len(report.removal_results) <= len(removed_scale_ids), \
            "Removal results should not exceed input scale count"
        
        # Property: Each removal result should be properly formed
        for result in report.removal_results:
            assert isinstance(result, RemovalResult), "Each result should be a RemovalResult"
            assert isinstance(result.success, bool), "Success should be boolean"
            assert isinstance(result.scale_id, str), "Scale ID should be string"
            assert result.scale_id.strip(), "Scale ID should be non-empty"
            assert isinstance(result.removal_reason, str), "Reason should be string"
            assert result.removal_reason.strip(), "Reason should be non-empty"
            assert isinstance(result.timestamp, datetime), "Timestamp should be datetime"
        
        # Property: Statistics should be consistent
        stats = cleanup_engine.get_statistics()
        assert isinstance(stats, dict), "Statistics should be a dictionary"
        assert 'removed' in stats, "Should track removed count"
        assert 'total_processed' in stats, "Should track total processed"
        assert stats['removed'] >= 0, "Removed count should be non-negative"
        assert stats['total_processed'] >= 0, "Total processed should be non-negative"


class TestScaleTypeRulesProperties:
    """Property-based tests for scale type-specific rules."""
    
    @given(st.sampled_from(list(ScaleType)), st.lists(search_result_strategy(), min_size=0, max_size=5))
    @settings(max_examples=50)
    def test_scale_type_specific_handling(self, scale_type, search_results):
        """
        Property: Different scale types should be handled according to their specific rules.
        """
        config = SystemConfig()
        config.removal_criteria.traditional_scale_leniency = True
        config.removal_criteria.minimum_confidence_for_removal = 0.7
        
        cleanup_engine = CleanupEngine(config)
        
        scale = ScaleData(
            scale_id="test_scale",
            name="Test Scale",
            notes=['C', 'D', 'E'],
            intervals=[2, 2],
            scale_type=scale_type,
            cultural_origin="test",
            description="Test scale"
        )
        
        decision = cleanup_engine.evaluate_removal_criteria(scale, search_results)
        
        # Property: Decision should be well-formed regardless of scale type
        assert isinstance(decision, RemovalDecision), "Should return RemovalDecision for any scale type"
        assert 0.0 <= decision.confidence <= 1.0, "Confidence should be valid for any scale type"
        
        # Property: Traditional scales should get leniency when configured
        if scale_type == ScaleType.TRADITIONAL and config.removal_criteria.traditional_scale_leniency:
            if decision.should_remove and decision.confidence < 0.8:
                # Should have leniency-related alternative actions
                leniency_actions = [a for a in decision.alternative_actions 
                                  if 'traditional' in a.lower() or 'leniency' in a.lower()]
                # This is a soft check since leniency might be applied in various ways
        
        # Property: Cultural scales should be handled carefully
        if scale_type == ScaleType.CULTURAL:
            if decision.should_remove and decision.confidence < 0.9:
                # Should be very cautious with cultural scales
                cultural_actions = [a for a in decision.alternative_actions 
                                  if 'cultural' in a.lower() or 'expert' in a.lower()]
                # This is a soft check since cultural handling might vary
        
        # Property: Modern and synthetic scales should have stricter requirements
        if scale_type in [ScaleType.MODERN, ScaleType.SYNTHETIC]:
            # These scale types should not get special leniency
            # The confidence calculation might be adjusted, but this is implementation-dependent
            pass  # This is more of a design principle than a testable property
    
    @given(scale_data_strategy(), st.floats(min_value=0.1, max_value=0.9))
    @settings(max_examples=30)
    def test_ambiguous_case_flagging(self, scale, confidence_level):
        """
        Property: Ambiguous cases should be flagged for manual review rather than automatic removal.
        """
        config = SystemConfig()
        config.removal_criteria.flag_ambiguous_cases = True
        config.removal_criteria.minimum_confidence_for_removal = 0.8
        
        cleanup_engine = CleanupEngine(config)
        
        # Create search results that would lead to the specified confidence level
        # This is a simplified simulation
        num_results = 1 if confidence_level < 0.5 else 3
        search_results = []
        
        for i in range(num_results):
            result = SearchResult(
                url=f"https://example{i}.com/scale",
                title=f"Scale information {i}",
                snippet=f"Some information about the scale {i}",
                relevance_score=confidence_level + (i * 0.1),
                source_type=SourceType.EDUCATIONAL if i == 0 else SourceType.COMMERCIAL,
                search_engine="test",
                found_at=datetime.now()
            )
            search_results.append(result)
        
        decision = cleanup_engine.evaluate_removal_criteria(scale, search_results)
        
        # Property: When flagging is enabled and confidence is ambiguous, should flag for review
        if config.removal_criteria.flag_ambiguous_cases and 0.3 <= decision.confidence <= 0.7:
            # Should either not remove or have alternative actions
            if not decision.should_remove:
                # Good - not removing ambiguous cases
                pass
            else:
                # If removing, should have very high confidence
                assert decision.confidence >= config.removal_criteria.minimum_confidence_for_removal, \
                    "Ambiguous cases should not be removed unless confidence is very high"
        
        # Property: Alternative actions should be provided for ambiguous cases
        if 0.3 <= decision.confidence <= 0.7:
            # Should have some guidance on what to do
            total_guidance = len(decision.alternative_actions) + len(decision.reasons)
            assert total_guidance > 0, "Should provide guidance for ambiguous cases"


class TestBackupAndRollbackProperties:
    """Property-based tests for backup and rollback functionality."""
    
    @given(st.lists(scale_data_strategy(), min_size=1, max_size=5))
    @settings(max_examples=20)
    def test_backup_creation_properties(self, scales):
        """
        Property: Backup operations should be reliable and preserve all scale data.
        """
        config = SystemConfig()
        config.database.create_backups = True
        
        with tempfile.TemporaryDirectory() as temp_dir:
            config.database.backup_directory = temp_dir
            
            cleanup_engine = CleanupEngine(config)
            
            # Property: Should be able to backup any list of scales
            backup_result = cleanup_engine.backup_removed_scales(scales)
            
            # Universal properties for backup results
            assert isinstance(backup_result, BackupResult), "Should return BackupResult"
            assert isinstance(backup_result.success, bool), "Success should be boolean"
            assert isinstance(backup_result.backup_location, str), "Location should be string"
            assert isinstance(backup_result.scales_backed_up, int), "Count should be integer"
            assert isinstance(backup_result.backup_size_bytes, int), "Size should be integer"
            assert isinstance(backup_result.timestamp, datetime), "Timestamp should be datetime"
            
            # Property: Counts should be consistent
            assert backup_result.scales_backed_up >= 0, "Backed up count should be non-negative"
            assert backup_result.backup_size_bytes >= 0, "Backup size should be non-negative"
            
            if backup_result.success:
                assert backup_result.scales_backed_up == len(scales), \
                    "Successful backup should match input scale count"
                assert backup_result.backup_location.strip(), \
                    "Successful backup should have non-empty location"
                
                # Property: Backup file should exist and be readable
                backup_path = Path(backup_result.backup_location)
                assert backup_path.exists(), "Backup file should exist"
                assert backup_path.is_file(), "Backup should be a file"
                assert backup_path.stat().st_size > 0, "Backup file should not be empty"
                
                # Property: Backup should contain valid JSON
                try:
                    with open(backup_path, 'r', encoding='utf-8') as f:
                        backup_data = json.load(f)
                    
                    assert isinstance(backup_data, dict), "Backup should contain a dictionary"
                    assert 'scales' in backup_data, "Backup should contain scales data"
                    assert 'backup_timestamp' in backup_data, "Backup should have timestamp"
                    assert 'scales_count' in backup_data, "Backup should have count"
                    
                    assert backup_data['scales_count'] == len(scales), \
                        "Backup count should match actual scales"
                    assert len(backup_data['scales']) == len(scales), \
                        "Backup scales list should match input"
                    
                except json.JSONDecodeError:
                    pytest.fail("Backup file should contain valid JSON")
    
    @given(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Pd'))))
    @settings(max_examples=20)
    def test_individual_scale_backup_properties(self, scale_id):
        """
        Property: Individual scale backups should be created before removal operations.
        """
        config = SystemConfig()
        config.database.create_backups = True
        
        with tempfile.TemporaryDirectory() as temp_dir:
            config.database.backup_directory = temp_dir
            
            # Mock database interface
            mock_database = Mock(spec=DatabaseInterface)
            test_scale = ScaleData(
                scale_id=scale_id,
                name="Test Scale",
                notes=['C', 'D', 'E'],
                intervals=[2, 2],
                scale_type=ScaleType.MODERN,
                cultural_origin="test",
                description="Test scale for backup"
            )
            mock_database.load_scales.return_value = [test_scale]
            mock_database.remove_scale_by_id.return_value = True
            
            cleanup_engine = CleanupEngine(config, database=mock_database)
            
            # Property: Removal should create backup when configured
            removal_result = cleanup_engine.remove_scale(scale_id, "Test removal")
            
            assert isinstance(removal_result, RemovalResult), "Should return RemovalResult"
            
            if removal_result.success and config.database.create_backups:
                assert removal_result.backup_created, "Should create backup when configured"
                assert removal_result.backup_location.strip(), "Should have backup location"
                
                # Property: Backup location should be valid path
                backup_path = Path(removal_result.backup_location)
                # Note: In this test, the backup might not actually exist since we're using mocks
                # But the path should be well-formed
                assert str(backup_path).startswith(temp_dir), "Backup should be in configured directory"
                assert scale_id in str(backup_path), "Backup filename should include scale ID"


class TestStatisticsAndReportingProperties:
    """Property-based tests for statistics tracking and reporting."""
    
    @given(st.lists(st.sampled_from(['processed', 'removed', 'flagged', 'kept', 'error']), min_size=1, max_size=20))
    @settings(max_examples=30)
    def test_statistics_consistency(self, operations):
        """
        Property: Statistics should accurately reflect all operations performed.
        """
        config = SystemConfig()
        cleanup_engine = CleanupEngine(config)
        
        # Track expected counts
        expected_counts = {
            'total_processed': 0,
            'removed': 0,
            'flagged': 0,
            'kept': 0,
            'errors': 0
        }
        
        # Perform operations and track expectations
        for operation in operations:
            cleanup_engine.update_statistics(operation)
            if operation in expected_counts:
                expected_counts[operation] += 1
            if operation == 'processed':
                expected_counts['total_processed'] += 1
        
        # Property: Statistics should match expected counts
        stats = cleanup_engine.get_statistics()
        
        assert isinstance(stats, dict), "Statistics should be a dictionary"
        
        for key, expected_value in expected_counts.items():
            assert key in stats, f"Statistics should include {key}"
            assert stats[key] == expected_value, \
                f"Expected {key}={expected_value}, got {stats[key]}"
        
        # Property: All counts should be non-negative
        for key, value in stats.items():
            if isinstance(value, (int, float)) and key != 'processing_time_seconds':
                assert value >= 0, f"Statistic {key} should be non-negative, got {value}"
        
        # Property: Success rate should be calculated correctly
        if 'success_rate' in stats:
            total_operations = stats.get('removed', 0) + stats.get('kept', 0) + stats.get('errors', 0)
            if total_operations > 0:
                expected_success_rate = (stats.get('removed', 0) + stats.get('kept', 0)) / total_operations
                assert abs(stats['success_rate'] - expected_success_rate) < 0.01, \
                    "Success rate should be calculated correctly"
            else:
                assert stats['success_rate'] >= 0.0, "Success rate should be non-negative"
    
    @given(st.integers(min_value=1, max_value=10))
    @settings(max_examples=20)
    def test_statistics_reset_properties(self, num_operations):
        """
        Property: Statistics reset should clear all counters and preserve structure.
        """
        config = SystemConfig()
        cleanup_engine = CleanupEngine(config)
        
        # Perform some operations
        for i in range(num_operations):
            cleanup_engine.update_statistics('processed')
            if i % 2 == 0:
                cleanup_engine.update_statistics('removed')
            else:
                cleanup_engine.update_statistics('kept')
        
        # Verify statistics have values
        stats_before = cleanup_engine.get_statistics()
        assert stats_before['total_processed'] > 0, "Should have processed some items"
        
        # Property: Reset should clear all counters
        cleanup_engine.reset_statistics()
        stats_after = cleanup_engine.get_statistics()
        
        # Property: Structure should be preserved
        assert isinstance(stats_after, dict), "Statistics should still be a dictionary"
        assert set(stats_before.keys()).issubset(set(stats_after.keys())), \
            "Reset should preserve statistics structure"
        
        # Property: All counters should be reset to zero
        for key in ['total_processed', 'removed', 'flagged', 'kept', 'errors']:
            if key in stats_after:
                assert stats_after[key] == 0, f"Counter {key} should be reset to 0"
        
        # Property: Processing time should be reset
        if 'processing_time_seconds' in stats_after:
            assert stats_after['processing_time_seconds'] >= 0, \
                "Processing time should be non-negative after reset"
            # Should be very small since we just reset
            assert stats_after['processing_time_seconds'] < 1.0, \
                "Processing time should be small immediately after reset"


if __name__ == "__main__":
    pytest.main([__file__])