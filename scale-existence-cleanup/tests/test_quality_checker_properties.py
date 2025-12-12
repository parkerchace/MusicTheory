"""
Property-based tests for Documentation Quality Checker.
**Feature: scale-existence-cleanup, Property 3: Scale information verification**
**Feature: scale-existence-cleanup, Property 6: Educational content verification**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from datetime import datetime
from unittest.mock import Mock, patch
import requests

from src.quality_checker import DocumentationQualityChecker
from src.config import SystemConfig, create_default_config
from src.models import ScaleInformation, QualityAssessment, SourceType


# Strategies for generating test data
@st.composite
def valid_html_content_strategy(draw):
    """Generate HTML content that contains scale information."""
    scale_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=3, max_size=15))
    
    # Generate content with scale information
    notes = draw(st.lists(st.sampled_from(['C', 'D', 'E', 'F', 'G', 'A', 'B']), min_size=3, max_size=7))
    intervals = draw(st.lists(st.integers(min_value=1, max_value=3), min_size=2, max_size=6))
    
    # Create HTML content with scale information
    content_parts = [
        f"<html><body>",
        f"<h1>{scale_name} Scale</h1>",
        f"<p>The {scale_name} scale contains the notes: {' '.join(notes)}</p>",
        f"<p>The intervals are: {'-'.join(map(str, intervals))}</p>",
        f"<p>This is a musical scale used in music theory.</p>",
        f"</body></html>"
    ]
    
    return scale_name, '\n'.join(content_parts)


@st.composite
def educational_html_content_strategy(draw):
    """Generate HTML content from educational sources."""
    scale_name = draw(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=3, max_size=15))
    
    educational_indicators = draw(st.lists(
        st.sampled_from(['lesson', 'tutorial', 'course', 'study', 'education', 'academic']),
        min_size=1, max_size=3
    ))
    
    content_parts = [
        f"<html><body>",
        f"<h1>Music Theory {educational_indicators[0].title()}: {scale_name}</h1>",
        f"<p>This {educational_indicators[0]} covers the {scale_name} scale.</p>",
        f"<p>Students will learn about musical intervals and scale construction.</p>",
        f"<p>This is an academic resource for music theory education.</p>",
        f"</body></html>"
    ]
    
    return scale_name, '\n'.join(content_parts)


@st.composite
def non_scale_html_content_strategy(draw):
    """Generate HTML content that does not contain scale information."""
    content_parts = [
        f"<html><body>",
        f"<h1>Random Content</h1>",
        f"<p>This page is about something completely different.</p>",
        f"<p>No musical information here.</p>",
        f"</body></html>"
    ]
    
    return '\n'.join(content_parts)


@st.composite
def valid_url_strategy(draw):
    """Generate valid HTTP/HTTPS URLs."""
    protocol = draw(st.sampled_from(['http://', 'https://']))
    domain = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd'))))
    tld = draw(st.sampled_from(['.com', '.org', '.edu', '.net']))
    return f"{protocol}{domain}{tld}"


@st.composite
def educational_url_strategy(draw):
    """Generate URLs from educational domains."""
    protocol = draw(st.sampled_from(['http://', 'https://']))
    domain = draw(st.text(min_size=1, max_size=15, alphabet=st.characters(whitelist_categories=('Ll', 'Nd'))))
    edu_tld = draw(st.sampled_from(['.edu', '.ac.uk', '.edu.au']))
    return f"{protocol}{domain}{edu_tld}"


class TestQualityCheckerProperties:
    """Property-based tests for Documentation Quality Checker."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = create_default_config()
        self.quality_checker = DocumentationQualityChecker(self.config)
    
    @given(valid_html_content_strategy())
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_scale_information_verification_property(self, content_data):
        """
        **Feature: scale-existence-cleanup, Property 3: Scale information verification**
        For any page classified as dedicated to a scale, the system should verify it contains 
        actual scale information (notes, intervals, or musical examples).
        **Validates: Requirements 1.3**
        """
        scale_name, html_content = content_data
        
        # Extract scale information from the content
        extracted_info = self.quality_checker.extract_scale_information(html_content, scale_name)
        
        # If the content contains scale information, the extraction should find it
        if any(keyword in html_content.lower() for keyword in ['notes', 'intervals', 'scale']):
            # Should extract the scale name correctly
            assert extracted_info.scale_name == scale_name
            
            # Should have some completeness score
            assert 0.0 <= extracted_info.completeness_score <= 1.0
            
            # If notes are mentioned in content, should extract some notes or intervals
            if 'notes' in html_content.lower():
                assert len(extracted_info.notes) > 0 or len(extracted_info.intervals) > 0
    
    @given(educational_html_content_strategy(), educational_url_strategy())
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_educational_content_verification_property(self, content_data, edu_url):
        """
        **Feature: scale-existence-cleanup, Property 6: Educational content verification**
        For any source being evaluated, the Documentation_Quality_Checker should verify 
        the content is educational or academic in nature.
        **Validates: Requirements 2.1**
        """
        scale_name, html_content = content_data
        
        # Mock the HTTP request to return our educational content
        mock_response = Mock()
        mock_response.text = html_content
        mock_response.raise_for_status.return_value = None
        
        with patch.object(self.quality_checker.session, 'get', return_value=mock_response):
            # Evaluate the source quality
            assessment = self.quality_checker.evaluate_source_quality(edu_url, scale_name)
            
            # Educational content should have higher educational value
            assert assessment.educational_value > 0.0
            
            # Educational domains should get higher source authority
            if any(edu_domain in edu_url for edu_domain in ['.edu', '.ac.uk', '.edu.au']):
                assert assessment.source_authority >= 0.4  # Should get educational domain bonus
            
            # Should be fair use compliant for educational purposes
            assert assessment.fair_use_compliant
            
            # Should extract information successfully
            assert isinstance(assessment.extracted_information, ScaleInformation)
            assert assessment.extracted_information.scale_name == scale_name
    
    @given(non_scale_html_content_strategy(), valid_url_strategy())
    @settings(suppress_health_check=[HealthCheck.too_slow])
    def test_non_scale_content_rejection(self, html_content, url):
        """
        **Feature: scale-existence-cleanup, Property 3: Scale information verification**
        For content that does not contain scale information, the system should correctly 
        identify the lack of scale information.
        **Validates: Requirements 1.3**
        """
        scale_name = "TestScale"
        
        # Mock the HTTP request to return non-scale content
        mock_response = Mock()
        mock_response.text = html_content
        mock_response.raise_for_status.return_value = None
        
        with patch.object(self.quality_checker.session, 'get', return_value=mock_response):
            # Evaluate the source quality
            assessment = self.quality_checker.evaluate_source_quality(url, scale_name)
            
            # Should correctly identify lack of scale information
            assert not assessment.has_scale_information
            
            # Information completeness should be low
            assert assessment.information_completeness < 0.5
            
            # Should have quality issues
            assert len(assessment.quality_issues) > 0
            assert any("No musical scale data found" in issue for issue in assessment.quality_issues)
    
    @given(st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), min_size=1, max_size=20), st.text(min_size=10, max_size=1000))
    def test_scale_information_extraction_consistency(self, scale_name, content):
        """
        **Feature: scale-existence-cleanup, Property 3: Scale information verification**
        For any content and scale name, the extraction should be consistent and return valid data.
        **Validates: Requirements 1.3**
        """
        # Extract scale information
        extracted_info = self.quality_checker.extract_scale_information(content, scale_name)
        
        # Should always return a valid ScaleInformation object
        assert isinstance(extracted_info, ScaleInformation)
        assert extracted_info.scale_name == scale_name
        assert 0.0 <= extracted_info.completeness_score <= 1.0
        
        # All intervals should be positive if any exist
        if extracted_info.intervals:
            assert all(interval > 0 for interval in extracted_info.intervals)
        
        # Notes should be valid musical notes if any exist
        if extracted_info.notes:
            valid_notes = {'C', 'D', 'E', 'F', 'G', 'A', 'B'}
            for note in extracted_info.notes:
                # Should start with a valid note letter
                assert note[0] in valid_notes
    
    @given(educational_url_strategy())
    def test_educational_compliance_checking(self, edu_url):
        """
        **Feature: scale-existence-cleanup, Property 6: Educational content verification**
        For educational URLs, compliance checking should recognize educational nature.
        **Validates: Requirements 2.1**
        """
        # Check educational compliance
        compliance_result = self.quality_checker.check_educational_compliance(edu_url)
        
        # Should have valid compliance score
        assert 0.0 <= compliance_result.compliance_score <= 1.0
        
        # Educational domains should have higher compliance scores
        if any(edu_domain in edu_url for edu_domain in ['.edu', '.ac.uk', '.edu.au']):
            assert compliance_result.compliance_score >= 0.7
        
        # Should validate educational purpose
        assert self.quality_checker.validate_educational_purpose(
            "Scale documentation quality assessment"
        )
    
    @given(st.text(min_size=0, max_size=2000))
    def test_content_usage_limits_checking(self, content):
        """
        **Feature: scale-existence-cleanup, Property 6: Educational content verification**
        For any content, usage limits should be properly checked for fair use compliance.
        **Validates: Requirements 2.1**
        """
        # Check content usage limits
        compliance_check = self.quality_checker.check_content_usage_limits(content)
        
        # Should have valid usage percentage
        assert 0.0 <= compliance_check.usage_percentage <= 100.0
        
        # Content length should match actual length
        assert compliance_check.content_length == len(content)
        
        # Limit threshold should be positive
        assert compliance_check.limit_threshold > 0
        
        # Within limits should be consistent with actual comparison
        expected_within_limits = len(content) <= compliance_check.limit_threshold
        assert compliance_check.within_limits == expected_within_limits
        
        # If over limits, should have recommendations
        if not compliance_check.within_limits:
            assert len(compliance_check.recommendations) > 0
    
    @given(valid_html_content_strategy())
    def test_completeness_assessment_consistency(self, content_data):
        """
        **Feature: scale-existence-cleanup, Property 3: Scale information verification**
        For any extracted scale information, completeness assessment should be consistent.
        **Validates: Requirements 1.3**
        """
        scale_name, html_content = content_data
        
        # Extract scale information
        extracted_info = self.quality_checker.extract_scale_information(html_content, scale_name)
        
        # Assess completeness
        completeness_score = self.quality_checker.assess_documentation_completeness(extracted_info)
        
        # Should have valid overall score
        assert 0.0 <= completeness_score.overall_score <= 1.0
        
        # Individual components should be boolean
        assert isinstance(completeness_score.has_notes, bool)
        assert isinstance(completeness_score.has_intervals, bool)
        assert isinstance(completeness_score.has_description, bool)
        assert isinstance(completeness_score.has_examples, bool)
        assert isinstance(completeness_score.has_cultural_context, bool)
        
        # Overall score should reflect individual components
        components = [
            completeness_score.has_notes,
            completeness_score.has_intervals,
            completeness_score.has_description,
            completeness_score.has_examples,
            completeness_score.has_cultural_context
        ]
        expected_score = sum(components) / len(components)
        assert abs(completeness_score.overall_score - expected_score) < 0.01
    
    def test_error_handling_in_evaluation(self):
        """
        **Feature: scale-existence-cleanup, Property 3: Scale information verification**
        The system should handle errors gracefully during source evaluation.
        **Validates: Requirements 1.3**
        """
        # Test with invalid URL that will cause request to fail
        invalid_url = "https://nonexistent-domain-12345.com"
        scale_name = "TestScale"
        
        # Should not raise exception, but return failed assessment
        assessment = self.quality_checker.evaluate_source_quality(invalid_url, scale_name)
        
        # Should be a valid assessment object
        assert isinstance(assessment, QualityAssessment)
        assert not assessment.has_scale_information
        assert assessment.information_completeness == 0.0
        assert len(assessment.quality_issues) > 0
    
    @given(st.text(min_size=1, max_size=50))
    def test_educational_purpose_validation(self, operation_description):
        """
        **Feature: scale-existence-cleanup, Property 6: Educational content verification**
        The system should correctly validate educational purposes.
        **Validates: Requirements 2.1**
        """
        # Test educational purpose validation
        is_educational = self.quality_checker.validate_educational_purpose(operation_description)
        
        # Should return boolean
        assert isinstance(is_educational, bool)
        
        # If operation contains educational keywords, should be recognized
        educational_keywords = ['education', 'research', 'study', 'analysis', 'academic']
        if any(keyword in operation_description.lower() for keyword in educational_keywords):
            assert is_educational