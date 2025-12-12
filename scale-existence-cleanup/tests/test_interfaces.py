"""
Tests for interfaces and base implementations.
"""

import pytest
from datetime import datetime

from src.interfaces import (
    SearchEngineInterface, QualityCheckerInterface, CleanupEngineInterface,
    SearchEngineError, QualityCheckError, RemovalError
)
from src.base_implementations import BaseSearchEngine, BaseQualityChecker, BaseCleanupEngine
from src.models import ScaleData, ScaleType, SourceType
from src.config import create_default_config


class TestSearchEngine(BaseSearchEngine):
    """Test implementation of search engine."""
    
    def _perform_search(self, search_term: str):
        """Mock search implementation."""
        from src.models import SearchResult
        return [
            SearchResult(
                url='https://example.com/test',
                title=f'Test result for {search_term}',
                snippet=f'This is a test snippet about {search_term}',
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine=self.engine_name,
                found_at=datetime.now(),
                content_preview='Test content'
            )
        ]


class TestInterfaces:
    """Test interface implementations."""
    
    def test_search_engine_interface(self):
        """Test that search engine interface works."""
        config = create_default_config()
        engine = TestSearchEngine(config, 'google')
        
        # Test basic functionality
        assert engine.is_available()
        
        # Test search
        results = engine.search_scale('major scale')
        assert len(results) > 0
        
        # Test statistics
        stats = engine.get_search_statistics()
        assert stats.total_searches > 0
    
    def test_quality_checker_interface(self):
        """Test that quality checker interface works."""
        config = create_default_config()
        checker = BaseQualityChecker(config)
        
        # Test quality assessment
        assessment = checker.evaluate_source_quality('https://example.edu/scale', 'major scale')
        assert assessment.information_completeness >= 0.0
        assert assessment.educational_value >= 0.0
        assert assessment.source_authority >= 0.0
        
        # Test compliance check
        compliance = checker.check_educational_compliance('https://example.edu')
        assert isinstance(compliance.is_compliant, bool)
    
    def test_cleanup_engine_interface(self):
        """Test that cleanup engine interface works."""
        config = create_default_config()
        engine = BaseCleanupEngine(config)
        
        # Create test scale
        scale = ScaleData(
            scale_id='test_scale',
            name='Test Scale',
            notes=['C', 'D', 'E'],
            intervals=[2, 2, 1],
            scale_type=ScaleType.MODERN
        )
        
        # Test removal decision
        decision = engine.evaluate_removal_criteria(scale, [])
        assert isinstance(decision.should_remove, bool)
        assert 0.0 <= decision.confidence <= 1.0
        
        # Test backup
        backup_result = engine.backup_removed_scales([scale])
        assert backup_result.success
        assert backup_result.scales_backed_up == 1
    
    def test_error_handling(self):
        """Test error handling in interfaces."""
        config = create_default_config()
        
        # Test with invalid engine name
        with pytest.raises(SearchEngineError):
            TestSearchEngine(config, 'invalid_engine')
    
    def test_interface_contracts(self):
        """Test that interfaces define the expected methods."""
        # Check SearchEngineInterface
        required_methods = [
            'search_scale', 'search_with_alternatives', 'evaluate_search_relevance',
            'get_search_statistics', 'is_available'
        ]
        for method in required_methods:
            assert hasattr(SearchEngineInterface, method)
        
        # Check QualityCheckerInterface
        required_methods = [
            'evaluate_source_quality', 'extract_scale_information',
            'check_educational_compliance', 'assess_documentation_completeness'
        ]
        for method in required_methods:
            assert hasattr(QualityCheckerInterface, method)
        
        # Check CleanupEngineInterface
        required_methods = [
            'evaluate_removal_criteria', 'remove_scale',
            'generate_removal_report', 'backup_removed_scales'
        ]
        for method in required_methods:
            assert hasattr(CleanupEngineInterface, method)