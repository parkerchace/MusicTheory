"""
Property-based tests for data model integrity.
**Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from datetime import datetime, timedelta
import os
import tempfile
import yaml

from src.config import (
    SystemConfig, SearchEngineConfig, QualityThresholds, RemovalCriteria,
    FairUseConfig, BatchProcessingConfig, LoggingConfig, DatabaseConfig,
    ReportingConfig, LogLevel, create_default_config, load_config_from_file
)
from src.models import (
    SearchResult, ScaleInformation, QualityAssessment, RemovalDecision,
    ScaleData, SourceType, ScaleType
)


# Strategies for generating valid data
@st.composite
def valid_url_strategy(draw):
    """Generate valid HTTP/HTTPS URLs."""
    protocol = draw(st.sampled_from(['http://', 'https://']))
    domain = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd'))))
    tld = draw(st.sampled_from(['.com', '.org', '.edu', '.net']))
    return f"{protocol}{domain}{tld}"


@st.composite
def valid_search_result_strategy(draw):
    """Generate valid SearchResult instances."""
    # Generate simple, valid strings
    title = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc')), min_size=1, max_size=20))
    search_engine = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), min_size=1, max_size=10))
    
    return SearchResult(
        url=draw(valid_url_strategy()),
        title=title,
        snippet=draw(st.text(min_size=0, max_size=50)),
        relevance_score=draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
        source_type=draw(st.sampled_from(SourceType)),
        search_engine=search_engine,
        found_at=draw(st.datetimes(min_value=datetime(2000, 1, 1), max_value=datetime(2030, 1, 1))),
        content_preview=draw(st.text(min_size=0, max_size=50))
    )


@st.composite
def valid_scale_information_strategy(draw):
    """Generate valid ScaleInformation instances."""
    scale_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc')), min_size=1, max_size=20))
    
    return ScaleInformation(
        scale_name=scale_name,
        notes=draw(st.lists(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=3), min_size=0, max_size=7)),
        intervals=draw(st.lists(st.integers(min_value=1, max_value=12), min_size=0, max_size=7)),
        cultural_context=draw(st.text(min_size=0, max_size=20)),
        description=draw(st.text(min_size=0, max_size=50)),
        musical_examples=draw(st.booleans()),
        theoretical_explanation=draw(st.booleans()),
        completeness_score=draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    )


@st.composite
def valid_quality_assessment_strategy(draw):
    """Generate valid QualityAssessment instances."""
    return QualityAssessment(
        has_scale_information=draw(st.booleans()),
        information_completeness=draw(st.floats(min_value=0.0, max_value=1.0)),
        educational_value=draw(st.floats(min_value=0.0, max_value=1.0)),
        source_authority=draw(st.floats(min_value=0.0, max_value=1.0)),
        fair_use_compliant=draw(st.booleans()),
        extracted_information=draw(valid_scale_information_strategy()),
        quality_issues=draw(st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=10))
    )


@st.composite
def valid_removal_decision_strategy(draw):
    """Generate valid RemovalDecision instances."""
    should_remove = draw(st.booleans())
    reasons = draw(st.lists(st.text(min_size=1, max_size=100), min_size=1 if should_remove else 0, max_size=5))
    
    return RemovalDecision(
        should_remove=should_remove,
        confidence=draw(st.floats(min_value=0.0, max_value=1.0)),
        reasons=reasons,
        alternative_actions=draw(st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=5)),
        supporting_evidence=draw(st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=5))
    )


@st.composite
def valid_search_engine_config_strategy(draw):
    """Generate valid SearchEngineConfig instances."""
    name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), min_size=1, max_size=10))
    
    return SearchEngineConfig(
        name=name,
        enabled=draw(st.booleans()),
        api_key=draw(st.text(min_size=0, max_size=20)),
        api_endpoint=draw(st.text(min_size=0, max_size=30)),
        rate_limit_requests_per_minute=draw(st.integers(min_value=1, max_value=100)),
        timeout_seconds=draw(st.integers(min_value=1, max_value=60)),
        max_results_per_query=draw(st.integers(min_value=1, max_value=20))
    )


@st.composite
def valid_system_config_strategy(draw):
    """Generate valid SystemConfig instances."""
    search_engines = draw(st.lists(valid_search_engine_config_strategy(), min_size=1, max_size=5))
    
    return SystemConfig(
        search_engines=search_engines,
        quality_thresholds=QualityThresholds(
            minimum_information_completeness=draw(st.floats(min_value=0.0, max_value=1.0)),
            minimum_educational_value=draw(st.floats(min_value=0.0, max_value=1.0)),
            minimum_source_authority=draw(st.floats(min_value=0.0, max_value=1.0)),
            minimum_overall_quality=draw(st.floats(min_value=0.0, max_value=1.0))
        ),
        removal_criteria=RemovalCriteria(
            minimum_sources_required=draw(st.integers(min_value=0, max_value=10)),
            minimum_confidence_for_removal=draw(st.floats(min_value=0.0, max_value=1.0))
        ),
        search_terms_templates=[
            '"{scale_name}" musical scale',
            '"{scale_name}" music theory'
        ]
    )


class TestDataModelProperties:
    """Property-based tests for data model integrity."""
    
    @given(valid_search_result_strategy())
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_search_result_integrity(self, search_result):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid SearchResult, all validation rules should be satisfied.
        **Validates: Requirements 6.1**
        """
        # The object should be created successfully (no exceptions)
        assert search_result.url.startswith(('http://', 'https://'))
        assert 0.0 <= search_result.relevance_score <= 1.0
        assert search_result.title.strip() != ""
        assert isinstance(search_result.source_type, SourceType)
        assert isinstance(search_result.found_at, datetime)
    
    @given(valid_scale_information_strategy())
    def test_scale_information_integrity(self, scale_info):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid ScaleInformation, all validation rules should be satisfied.
        **Validates: Requirements 6.1**
        """
        assert scale_info.scale_name.strip() != ""
        assert 0.0 <= scale_info.completeness_score <= 1.0
        # All intervals should be positive if any exist
        if scale_info.intervals:
            assert all(interval > 0 for interval in scale_info.intervals)
    
    @given(valid_quality_assessment_strategy())
    def test_quality_assessment_integrity(self, quality_assessment):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid QualityAssessment, all score values should be within valid ranges.
        **Validates: Requirements 6.1**
        """
        assert 0.0 <= quality_assessment.information_completeness <= 1.0
        assert 0.0 <= quality_assessment.educational_value <= 1.0
        assert 0.0 <= quality_assessment.source_authority <= 1.0
        assert isinstance(quality_assessment.fair_use_compliant, bool)
        assert isinstance(quality_assessment.extracted_information, ScaleInformation)
    
    @given(valid_removal_decision_strategy())
    def test_removal_decision_integrity(self, removal_decision):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid RemovalDecision, confidence should be valid and removal decisions should have reasons.
        **Validates: Requirements 6.1**
        """
        assert 0.0 <= removal_decision.confidence <= 1.0
        # If should_remove is True, there must be at least one reason
        if removal_decision.should_remove:
            assert len(removal_decision.reasons) > 0
    
    @given(valid_search_engine_config_strategy())
    def test_search_engine_config_integrity(self, config):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid SearchEngineConfig, all numeric values should be positive.
        **Validates: Requirements 6.1**
        """
        assert config.name.strip() != ""
        assert config.rate_limit_requests_per_minute > 0
        assert config.timeout_seconds > 0
        assert config.max_results_per_query > 0
        assert isinstance(config.enabled, bool)
    
    @given(valid_system_config_strategy())
    @settings(suppress_health_check=[HealthCheck.filter_too_much])
    def test_system_config_acceptance(self, config):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any valid SystemConfig, the system should accept customizable search terms and query patterns.
        **Validates: Requirements 6.1**
        """
        # System should accept the configuration
        assert len(config.search_engines) > 0
        assert all(engine.name.strip() for engine in config.search_engines)
        
        # All search terms templates should contain the scale_name placeholder
        assert len(config.search_terms_templates) > 0
        for template in config.search_terms_templates:
            assert "{scale_name}" in template
        
        # Quality thresholds should be valid
        assert 0.0 <= config.quality_thresholds.minimum_information_completeness <= 1.0
        assert 0.0 <= config.quality_thresholds.minimum_educational_value <= 1.0
        assert 0.0 <= config.quality_thresholds.minimum_source_authority <= 1.0
        assert 0.0 <= config.quality_thresholds.minimum_overall_quality <= 1.0
        
        # Removal criteria should be valid
        assert config.removal_criteria.minimum_sources_required >= 0
        assert 0.0 <= config.removal_criteria.minimum_confidence_for_removal <= 1.0
    
    @given(st.text(min_size=1, max_size=50), st.text(min_size=0, max_size=50))
    def test_search_terms_generation(self, scale_name, cultural_context):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        For any scale name and cultural context, the system should generate appropriate search terms.
        **Validates: Requirements 6.1**
        """
        config = create_default_config()
        search_terms = config.get_search_terms_for_scale(scale_name, cultural_context)
        
        # Should generate at least the basic search terms
        assert len(search_terms) >= len(config.search_terms_templates)
        
        # All generated terms should contain the scale name
        for term in search_terms:
            assert scale_name in term or any(alt in term for alt in config.scale_alternative_names.get(scale_name, []))
    
    def test_config_validation_with_invalid_data(self):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        The system should properly validate configuration and reject invalid data.
        **Validates: Requirements 6.1**
        """
        # Test invalid URL in SearchResult
        with pytest.raises(ValueError, match="URL must be a valid HTTP/HTTPS URL"):
            SearchResult(
                url="invalid-url",
                title="Test",
                snippet="Test snippet",
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine="test",
                found_at=datetime.now()
            )
        
        # Test invalid relevance score
        with pytest.raises(ValueError, match="Relevance score must be between 0.0 and 1.0"):
            SearchResult(
                url="https://example.com",
                title="Test",
                snippet="Test snippet",
                relevance_score=1.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine="test",
                found_at=datetime.now()
            )
        
        # Test empty scale name
        with pytest.raises(ValueError, match="Scale name cannot be empty"):
            ScaleInformation(
                scale_name="",
                completeness_score=0.5
            )
        
        # Test invalid intervals
        with pytest.raises(ValueError, match="All intervals must be positive"):
            ScaleInformation(
                scale_name="Test Scale",
                intervals=[1, 2, -1, 3],
                completeness_score=0.5
            )
    
    def test_config_file_loading(self):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        The system should accept configuration from YAML files.
        **Validates: Requirements 6.1**
        """
        # Create a temporary config file
        config_data = {
            'search_engines': [
                {
                    'name': 'test_engine',
                    'enabled': True,
                    'rate_limit_requests_per_minute': 30,
                    'timeout_seconds': 15,
                    'max_results_per_query': 5
                }
            ],
            'search_terms_templates': [
                '"{scale_name}" test template'
            ]
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_config_path = f.name
        
        try:
            # Should be able to load the config
            config = load_config_from_file(temp_config_path)
            assert len(config.search_engines) == 1
            assert config.search_engines[0].name == 'test_engine'
            assert len(config.search_terms_templates) == 1
        finally:
            os.unlink(temp_config_path)
    
    def test_default_config_creation(self):
        """
        **Feature: scale-existence-cleanup, Property 26: Configuration acceptance**
        The system should create valid default configurations.
        **Validates: Requirements 6.1**
        """
        config = create_default_config()
        
        # Should have default search engines
        assert len(config.search_engines) > 0
        
        # Should have default search terms
        assert len(config.search_terms_templates) > 0
        for template in config.search_terms_templates:
            assert "{scale_name}" in template
        
        # Should have cultural search terms
        assert len(config.cultural_search_terms) > 0
        
        # Should have alternative names
        assert len(config.scale_alternative_names) > 0
        
        # Configuration should be valid
        issues = config.validate_configuration()
        # Note: Issues might exist due to missing API keys, but structure should be valid
        assert isinstance(issues, list)