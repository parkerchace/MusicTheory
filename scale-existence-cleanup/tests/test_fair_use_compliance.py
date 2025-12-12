"""
Unit tests for the Fair Use Compliance Manager.
"""

import pytest
import tempfile
import os
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from src.fair_use_compliance import FairUseComplianceManager, ComplianceReporter
from src.models import FairUseActivity, ComplianceCheck, ComplianceResult
from src.config import FairUseConfig


class TestFairUseComplianceManager:
    """Test cases for FairUseComplianceManager."""
    
    @pytest.fixture
    def config(self):
        """Create a test configuration."""
        return FairUseConfig(
            educational_purpose_statement="Educational research and testing",
            max_content_length_per_source=1000,
            max_sources_per_scale=5,
            respect_robots_txt=True,
            user_agent="Test-Bot/1.0"
        )
    
    @pytest.fixture
    def compliance_manager(self, config):
        """Create a test compliance manager."""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_path = os.path.join(temp_dir, "test_compliance.log")
            return FairUseComplianceManager(config, log_path)
    
    def test_validate_educational_purpose_valid(self, compliance_manager):
        """Test validation of valid educational purposes."""
        valid_purposes = [
            "Educational research for database improvement",
            "Academic study of musical scales",
            "Learning about scale documentation quality",
            "Teaching music theory validation"
        ]
        
        for purpose in valid_purposes:
            assert compliance_manager.validate_educational_purpose(purpose)
    
    def test_validate_educational_purpose_invalid(self, compliance_manager):
        """Test validation of invalid educational purposes."""
        invalid_purposes = [
            "Commercial sale of scale data",
            "Marketing musical products",
            "Profit from scale information",
            "Business revenue generation"
        ]
        
        for purpose in invalid_purposes:
            assert not compliance_manager.validate_educational_purpose(purpose)
    
    def test_validate_educational_purpose_empty(self, compliance_manager):
        """Test validation with empty purpose."""
        assert not compliance_manager.validate_educational_purpose("")
        assert not compliance_manager.validate_educational_purpose("   ")
    
    def test_check_content_usage_limits_within_limits(self, compliance_manager):
        """Test content usage check within limits."""
        content = "x" * 500  # Half the limit
        result = compliance_manager.check_content_usage_limits(content, "http://example.com")
        
        assert result.within_limits
        assert result.content_length == 500
        assert result.usage_percentage == 50.0
        assert len(result.recommendations) == 0
    
    def test_check_content_usage_limits_exceeds_limits(self, compliance_manager):
        """Test content usage check exceeding limits."""
        content = "x" * 1500  # Exceeds limit
        result = compliance_manager.check_content_usage_limits(content, "http://example.com")
        
        assert not result.within_limits
        assert result.content_length == 1500
        assert result.usage_percentage == 150.0
        assert len(result.recommendations) > 0
    
    def test_check_content_usage_limits_empty_content(self, compliance_manager):
        """Test content usage check with empty content."""
        result = compliance_manager.check_content_usage_limits("", "http://example.com")
        
        assert result.within_limits
        assert result.content_length == 0
        assert result.usage_percentage == 0.0
    
    def test_log_fair_use_activity_valid(self, compliance_manager):
        """Test logging valid fair use activity."""
        activity = FairUseActivity(
            activity_type="search",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        
        # Should not raise exception
        compliance_manager.log_fair_use_activity(activity)
        
        # Check activity was added
        assert len(compliance_manager.activities) == 1
        assert compliance_manager.activities[0] == activity
    
    def test_log_fair_use_activity_invalid(self, compliance_manager):
        """Test logging invalid fair use activity."""
        # Empty activity type
        with pytest.raises(ValueError, match="Activity type cannot be empty"):
            activity = FairUseActivity(
                activity_type="",
                url="http://example.com",
                content_accessed=True,
                educational_purpose="Educational research"
            )
            compliance_manager.log_fair_use_activity(activity)
        
        # Invalid URL
        with pytest.raises(ValueError, match="Valid URL is required"):
            activity = FairUseActivity(
                activity_type="search",
                url="invalid-url",
                content_accessed=True,
                educational_purpose="Educational research"
            )
            compliance_manager.log_fair_use_activity(activity)
        
        # Empty educational purpose
        with pytest.raises(ValueError, match="Educational purpose must be specified"):
            activity = FairUseActivity(
                activity_type="search",
                url="http://example.com",
                content_accessed=True,
                educational_purpose=""
            )
            compliance_manager.log_fair_use_activity(activity)
    
    def test_generate_compliance_report(self, compliance_manager):
        """Test compliance report generation."""
        # Add some test activities
        activities = [
            FairUseActivity(
                activity_type="search",
                url="http://example1.com",
                content_accessed=True,
                educational_purpose="Educational research",
                content_length=100
            ),
            FairUseActivity(
                activity_type="extract",
                url="http://example2.com",
                content_accessed=True,
                educational_purpose="Academic study",
                content_length=200
            )
        ]
        
        for activity in activities:
            compliance_manager.log_fair_use_activity(activity)
        
        # Generate report
        report = compliance_manager.generate_compliance_report()
        
        assert report.total_activities == 2
        assert report.compliant_activities >= 0
        assert report.non_compliant_activities >= 0
        assert len(report.activities) == 2
    
    @patch('src.fair_use_compliance.RobotFileParser')
    def test_check_robots_txt_compliance_allowed(self, mock_robot_parser, compliance_manager):
        """Test robots.txt compliance check when allowed."""
        # Mock robots.txt parser
        mock_parser = MagicMock()
        mock_parser.can_fetch.return_value = True
        mock_robot_parser.return_value = mock_parser
        
        result = compliance_manager.check_robots_txt_compliance("http://example.com/page")
        
        assert result is True
        mock_parser.can_fetch.assert_called_once()
    
    @patch('src.fair_use_compliance.RobotFileParser')
    def test_check_robots_txt_compliance_disallowed(self, mock_robot_parser, compliance_manager):
        """Test robots.txt compliance check when disallowed."""
        # Mock robots.txt parser
        mock_parser = MagicMock()
        mock_parser.can_fetch.return_value = False
        mock_robot_parser.return_value = mock_parser
        
        result = compliance_manager.check_robots_txt_compliance("http://example.com/page")
        
        assert result is False
        mock_parser.can_fetch.assert_called_once()
    
    def test_validate_content_extraction_compliant(self, compliance_manager):
        """Test content extraction validation for compliant content."""
        content = "This is educational content about musical scales and research."
        result = compliance_manager.validate_content_extraction(content, "http://example.com")
        
        assert result.is_compliant
        assert result.compliance_score > 0.7
        assert len(result.issues) == 0
    
    def test_validate_content_extraction_non_compliant(self, compliance_manager):
        """Test content extraction validation for non-compliant content."""
        # Content that exceeds limits
        content = "x" * 2000  # Exceeds max content length
        result = compliance_manager.validate_content_extraction(content, "http://example.com")
        
        assert not result.is_compliant
        assert result.compliance_score < 0.7
        assert len(result.issues) > 0
    
    def test_get_usage_statistics(self, compliance_manager):
        """Test usage statistics generation."""
        # Add some activities
        activities = [
            FairUseActivity(
                activity_type="search",
                url="http://example1.com",
                content_accessed=True,
                educational_purpose="Educational research",
                content_length=100
            ),
            FairUseActivity(
                activity_type="extract",
                url="http://example2.com",
                content_accessed=True,
                educational_purpose="Academic study",
                content_length=200
            )
        ]
        
        for activity in activities:
            compliance_manager.log_fair_use_activity(activity)
        
        stats = compliance_manager.get_usage_statistics()
        
        assert stats['total_activities'] == 2
        assert stats['total_content_accessed'] == 300
        assert 'daily_usage' in stats
        assert 'url_usage' in stats
        assert 'config' in stats
    
    def test_export_compliance_log(self, compliance_manager):
        """Test compliance log export."""
        # Add test activity
        activity = FairUseActivity(
            activity_type="search",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        compliance_manager.log_fair_use_activity(activity)
        
        # Export to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            export_path = f.name
        
        try:
            result = compliance_manager.export_compliance_log(export_path)
            assert result is True
            
            # Verify file contents
            with open(export_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert 'export_timestamp' in data
            assert 'config' in data
            assert 'activities' in data
            assert 'usage_statistics' in data
            assert len(data['activities']) == 1
            
        finally:
            if os.path.exists(export_path):
                os.unlink(export_path)


class TestComplianceReporter:
    """Test cases for ComplianceReporter."""
    
    @pytest.fixture
    def config(self):
        """Create a test configuration."""
        return FairUseConfig(
            educational_purpose_statement="Educational research and testing",
            max_content_length_per_source=1000,
            max_sources_per_scale=5
        )
    
    @pytest.fixture
    def compliance_manager(self, config):
        """Create a test compliance manager."""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_path = os.path.join(temp_dir, "test_compliance.log")
            return FairUseComplianceManager(config, log_path)
    
    @pytest.fixture
    def reporter(self, compliance_manager):
        """Create a test compliance reporter."""
        return ComplianceReporter(compliance_manager)
    
    def test_track_fair_use_activity(self, reporter):
        """Test tracking fair use activity."""
        reporter.track_fair_use_activity(
            activity_type="search",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        
        # Check activity was logged
        assert len(reporter.compliance_manager.activities) == 1
    
    def test_track_fair_use_activity_with_violation(self, reporter):
        """Test tracking activity that generates violations."""
        # Activity that exceeds content limits
        reporter.track_fair_use_activity(
            activity_type="extract",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=2000  # Exceeds limit
        )
        
        # Check violation alert was generated
        assert len(reporter.violation_alerts) > 0
    
    def test_generate_audit_report(self, reporter):
        """Test audit report generation."""
        # Add some test activities
        reporter.track_fair_use_activity(
            activity_type="search",
            url="http://example1.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        
        reporter.track_fair_use_activity(
            activity_type="extract",
            url="http://example2.com",
            content_accessed=True,
            educational_purpose="Academic study",
            content_length=200
        )
        
        # Generate audit report
        report = reporter.generate_audit_report()
        
        assert 'report_metadata' in report
        assert 'compliance_summary' in report
        assert 'violation_summary' in report
        assert 'usage_statistics' in report
        assert 'configuration' in report
        assert 'recommendations' in report
        
        # Check compliance summary
        assert report['compliance_summary']['total_activities'] == 2
    
    def test_generate_markdown_report(self, reporter):
        """Test Markdown report generation."""
        # Add test activity
        reporter.track_fair_use_activity(
            activity_type="search",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        
        # Generate audit report
        audit_report = reporter.generate_audit_report()
        
        # Generate Markdown report
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            output_path = f.name
        
        try:
            result = reporter.generate_markdown_report(audit_report, output_path)
            assert result is True
            
            # Verify file was created and has content
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            assert "# Fair Use Compliance Audit Report" in content
            assert "## Executive Summary" in content
            assert "## Violation Summary" in content
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_generate_json_report(self, reporter):
        """Test JSON report generation."""
        # Add test activity
        reporter.track_fair_use_activity(
            activity_type="search",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Educational research",
            content_length=100
        )
        
        # Generate audit report
        audit_report = reporter.generate_audit_report()
        
        # Generate JSON report
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name
        
        try:
            result = reporter.generate_json_report(audit_report, output_path)
            assert result is True
            
            # Verify file was created and has valid JSON
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert 'report_metadata' in data
            assert 'compliance_summary' in data
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    def test_get_violation_alerts(self, reporter):
        """Test getting violation alerts."""
        # Add activity that generates violation
        reporter.track_fair_use_activity(
            activity_type="extract",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Commercial use",  # Non-educational
            content_length=100
        )
        
        # Get all alerts
        alerts = reporter.get_violation_alerts()
        assert len(alerts) > 0
        
        # Get high severity alerts
        high_alerts = reporter.get_violation_alerts(severity="high")
        assert isinstance(high_alerts, list)
        
        # Get limited alerts
        limited_alerts = reporter.get_violation_alerts(limit=1)
        assert len(limited_alerts) <= 1
    
    def test_clear_old_alerts(self, reporter):
        """Test clearing old violation alerts."""
        # Add violation alert with old timestamp
        old_activity = FairUseActivity(
            activity_type="extract",
            url="http://example.com",
            content_accessed=True,
            educational_purpose="Commercial use",
            content_length=100,
            timestamp=datetime.now() - timedelta(days=40)
        )
        
        # Manually add old alert
        reporter.violation_alerts.append({
            'timestamp': old_activity.timestamp,
            'activity': old_activity,
            'violations': [{'type': 'test', 'severity': 'high', 'description': 'test'}],
            'alert_id': 'test_alert'
        })
        
        # Clear old alerts
        cleared_count = reporter.clear_old_alerts(days_to_keep=30)
        assert cleared_count == 1
        assert len(reporter.violation_alerts) == 0


if __name__ == "__main__":
    pytest.main([__file__])