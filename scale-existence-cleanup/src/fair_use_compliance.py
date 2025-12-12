"""
Fair Use Compliance Manager for the Scale Existence Cleanup System.

This module implements educational fair use compliance validation and logging
to ensure all operations comply with fair use educational guidelines.
"""

import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import json
import os

try:
    # Try relative imports first (when used as module)
    from .interfaces import FairUseComplianceInterface
    from .models import (
except ImportError:
    # Fall back to absolute imports (when run as script)
    from interfaces import FairUseComplianceInterface
    from models import (
    FairUseActivity, ComplianceReport, ComplianceCheck, ComplianceResult
)
try:
    # Try relative imports first (when used as module)
    from .config import FairUseConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from config import FairUseConfig


class FairUseComplianceManager(FairUseComplianceInterface):
    """
    Manages fair use compliance for educational purposes.
    
    This class validates that all operations comply with fair use educational
    guidelines, enforces content usage limits, and maintains comprehensive
    compliance activity logging.
    """
    
    def __init__(self, config: FairUseConfig, log_file_path: str = "fair_use_compliance.log"):
        """
        Initialize the Fair Use Compliance Manager.
        
        Args:
            config: Fair use configuration
            log_file_path: Path to the compliance log file
        """
        self.config = config
        self.log_file_path = log_file_path
        self.activities: List[FairUseActivity] = []
        self.content_usage_tracker: Dict[str, int] = {}  # URL -> content length accessed
        self.daily_usage_tracker: Dict[str, int] = {}  # Date -> total content accessed
        
        # Set up logging
        self.logger = logging.getLogger(__name__)
        self._setup_compliance_logging()
        
        # Educational purpose keywords for validation
        self.educational_keywords = {
            'research', 'study', 'education', 'academic', 'learning', 'teaching',
            'analysis', 'scholarship', 'critique', 'review', 'documentation',
            'database', 'quality', 'improvement', 'validation', 'verification'
        }
        
        # Non-educational purpose indicators
        self.commercial_indicators = {
            'profit', 'commercial', 'sale', 'marketing', 'advertising', 'business',
            'revenue', 'monetize', 'sell', 'purchase', 'buy', 'payment'
        }
        
        self.logger.info("Fair Use Compliance Manager initialized")
    
    def _setup_compliance_logging(self) -> None:
        """Set up dedicated logging for compliance activities."""
        # Create compliance-specific logger
        compliance_logger = logging.getLogger('fair_use_compliance')
        compliance_logger.setLevel(logging.INFO)
        
        # Create file handler for compliance log
        if not os.path.exists(os.path.dirname(self.log_file_path)):
            os.makedirs(os.path.dirname(self.log_file_path), exist_ok=True)
        
        file_handler = logging.FileHandler(self.log_file_path, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)
        
        # Add handler to logger
        compliance_logger.addHandler(file_handler)
        
        self.compliance_logger = compliance_logger
    
    def validate_educational_purpose(self, operation: str) -> bool:
        """
        Validate that an operation serves an educational purpose.
        
        Args:
            operation: Description of the operation
            
        Returns:
            True if operation is for educational purposes
        """
        if not operation or not operation.strip():
            self.logger.warning("Empty operation description provided for validation")
            return False
        
        operation_lower = operation.lower()
        
        # Check for educational keywords
        has_educational_keywords = any(
            keyword in operation_lower for keyword in self.educational_keywords
        )
        
        # Check for commercial indicators (should not be present)
        has_commercial_indicators = any(
            indicator in operation_lower for indicator in self.commercial_indicators
        )
        
        # Operation is educational if it has educational keywords and no commercial indicators
        is_educational = has_educational_keywords and not has_commercial_indicators
        
        # Log the validation
        self.compliance_logger.info(
            f"Educational purpose validation - Operation: '{operation}' - "
            f"Educational: {is_educational} - "
            f"Has educational keywords: {has_educational_keywords} - "
            f"Has commercial indicators: {has_commercial_indicators}"
        )
        
        if not is_educational:
            self.logger.warning(
                f"Operation failed educational purpose validation: {operation}"
            )
        
        return is_educational
    
    def check_content_usage_limits(self, content: str, url: str = "") -> ComplianceCheck:
        """
        Check if content usage is within fair use limits.
        
        Args:
            content: Content to check
            url: URL of the content source (optional)
            
        Returns:
            Compliance check result
        """
        if not content:
            return ComplianceCheck(
                within_limits=True,
                content_length=0,
                limit_threshold=self.config.max_content_length_per_source,
                usage_percentage=0.0,
                recommendations=[]
            )
        
        content_length = len(content)
        limit_threshold = self.config.max_content_length_per_source
        usage_percentage = (content_length / limit_threshold) * 100
        
        within_limits = content_length <= limit_threshold
        recommendations = []
        
        # Track usage per URL
        if url:
            if url in self.content_usage_tracker:
                self.content_usage_tracker[url] += content_length
            else:
                self.content_usage_tracker[url] = content_length
            
            total_usage_for_url = self.content_usage_tracker[url]
            if total_usage_for_url > limit_threshold:
                within_limits = False
                recommendations.append(
                    f"Total content accessed from {url} exceeds limit: "
                    f"{total_usage_for_url} > {limit_threshold}"
                )
        
        # Track daily usage
        today = datetime.now().strftime('%Y-%m-%d')
        if today in self.daily_usage_tracker:
            self.daily_usage_tracker[today] += content_length
        else:
            self.daily_usage_tracker[today] = content_length
        
        # Add recommendations based on usage
        if usage_percentage > 80:
            recommendations.append(
                "Content usage is approaching the fair use limit. "
                "Consider reducing content extraction or using multiple sources."
            )
        
        if usage_percentage > 100:
            recommendations.append(
                "Content usage exceeds fair use limits. "
                "Reduce content extraction to comply with educational fair use."
            )
        
        # Log the check
        self.compliance_logger.info(
            f"Content usage check - URL: {url} - "
            f"Length: {content_length} - "
            f"Limit: {limit_threshold} - "
            f"Usage: {usage_percentage:.1f}% - "
            f"Within limits: {within_limits}"
        )
        
        return ComplianceCheck(
            within_limits=within_limits,
            content_length=content_length,
            limit_threshold=limit_threshold,
            usage_percentage=usage_percentage,
            recommendations=recommendations
        )
    
    def log_fair_use_activity(self, activity: FairUseActivity) -> None:
        """
        Log an activity for fair use compliance tracking.
        
        Args:
            activity: Activity to log
        """
        # Validate the activity
        if not activity.activity_type.strip():
            raise ValueError("Activity type cannot be empty")
        
        if not activity.url or not activity.url.startswith(('http://', 'https://')):
            raise ValueError("Valid URL is required for activity logging")
        
        if not activity.educational_purpose.strip():
            raise ValueError("Educational purpose must be specified")
        
        # Add to activities list
        self.activities.append(activity)
        
        # Log to compliance log
        self.compliance_logger.info(
            f"Activity logged - Type: {activity.activity_type} - "
            f"URL: {activity.url} - "
            f"Content accessed: {activity.content_accessed} - "
            f"Content length: {activity.content_length} - "
            f"Educational purpose: {activity.educational_purpose}"
        )
        
        # Check if this activity complies with usage limits
        if activity.content_accessed and activity.content_length > 0:
            compliance_check = self.check_content_usage_limits(
                "x" * activity.content_length,  # Dummy content for length check
                activity.url
            )
            
            if not compliance_check.within_limits:
                self.logger.warning(
                    f"Activity may exceed fair use limits: {activity.activity_type} "
                    f"on {activity.url}"
                )
                
                # Log compliance violation
                self.compliance_logger.warning(
                    f"COMPLIANCE VIOLATION - Activity: {activity.activity_type} - "
                    f"URL: {activity.url} - "
                    f"Content length: {activity.content_length} - "
                    f"Recommendations: {'; '.join(compliance_check.recommendations)}"
                )
    
    def generate_compliance_report(self, 
                                 start_date: Optional[datetime] = None,
                                 end_date: Optional[datetime] = None) -> ComplianceReport:
        """
        Generate a compliance report for audit purposes.
        
        Args:
            start_date: Start date for the report period (optional)
            end_date: End date for the report period (optional)
            
        Returns:
            Compliance report
        """
        # Set default date range if not provided
        if end_date is None:
            end_date = datetime.now()
        
        if start_date is None:
            start_date = end_date - timedelta(days=30)  # Default to last 30 days
        
        # Filter activities by date range
        filtered_activities = [
            activity for activity in self.activities
            if start_date <= activity.timestamp <= end_date
        ]
        
        # Count compliant and non-compliant activities
        compliant_count = 0
        non_compliant_count = 0
        
        for activity in filtered_activities:
            # Check if activity is compliant
            is_educational = self.validate_educational_purpose(activity.educational_purpose)
            
            if activity.content_accessed and activity.content_length > 0:
                usage_check = self.check_content_usage_limits(
                    "x" * activity.content_length,
                    activity.url
                )
                within_limits = usage_check.within_limits
            else:
                within_limits = True
            
            if is_educational and within_limits:
                compliant_count += 1
            else:
                non_compliant_count += 1
        
        # Create compliance report
        report = ComplianceReport(
            total_activities=len(filtered_activities),
            compliant_activities=compliant_count,
            non_compliant_activities=non_compliant_count,
            activities=filtered_activities,
            report_period_start=start_date,
            report_period_end=end_date
        )
        
        # Log report generation
        self.compliance_logger.info(
            f"Compliance report generated - Period: {start_date} to {end_date} - "
            f"Total activities: {report.total_activities} - "
            f"Compliant: {report.compliant_activities} - "
            f"Non-compliant: {report.non_compliant_activities}"
        )
        
        return report
    
    def check_robots_txt_compliance(self, url: str) -> bool:
        """
        Check if accessing a URL complies with robots.txt.
        
        Args:
            url: URL to check
            
        Returns:
            True if access is allowed by robots.txt
        """
        if not self.config.respect_robots_txt:
            return True
        
        try:
            from urllib.robotparser import RobotFileParser
            
            parsed_url = urlparse(url)
            robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
            
            rp = RobotFileParser()
            rp.set_url(robots_url)
            rp.read()
            
            # Check if our user agent can fetch the URL
            can_fetch = rp.can_fetch(self.config.user_agent, url)
            
            self.compliance_logger.info(
                f"Robots.txt check - URL: {url} - "
                f"Robots URL: {robots_url} - "
                f"Can fetch: {can_fetch}"
            )
            
            return can_fetch
            
        except Exception as e:
            self.logger.warning(f"Could not check robots.txt for {url}: {e}")
            # If we can't check robots.txt, assume it's allowed
            return True
    
    def validate_content_extraction(self, content: str, source_url: str) -> ComplianceResult:
        """
        Validate that content extraction complies with fair use guidelines.
        
        Args:
            content: Content that was extracted
            source_url: URL of the source
            
        Returns:
            Compliance result
        """
        issues = []
        recommendations = []
        compliance_score = 1.0
        
        # Check content length
        usage_check = self.check_content_usage_limits(content, source_url)
        if not usage_check.within_limits:
            issues.append("Content extraction exceeds fair use limits")
            recommendations.extend(usage_check.recommendations)
            compliance_score -= 0.3
        
        # Check for robots.txt compliance
        if not self.check_robots_txt_compliance(source_url):
            issues.append("Access may violate robots.txt restrictions")
            recommendations.append("Respect robots.txt restrictions")
            compliance_score -= 0.2
        
        # Check for educational content indicators
        content_lower = content.lower()
        educational_indicators = sum(1 for keyword in self.educational_keywords 
                                   if keyword in content_lower)
        
        if educational_indicators == 0:
            issues.append("Content may not be educational in nature")
            recommendations.append("Focus on educational sources")
            compliance_score -= 0.2
        
        # Check for copyright notices or restrictions
        copyright_patterns = [
            r'©\s*\d{4}', r'copyright\s+\d{4}', r'all rights reserved',
            r'no reproduction', r'unauthorized use', r'proprietary'
        ]
        
        for pattern in copyright_patterns:
            if re.search(pattern, content_lower):
                issues.append("Content contains copyright restrictions")
                recommendations.append("Ensure compliance with copyright restrictions")
                compliance_score -= 0.1
                break
        
        # Ensure score doesn't go below 0
        compliance_score = max(0.0, compliance_score)
        
        is_compliant = len(issues) == 0 and compliance_score >= 0.7
        
        # Log the validation
        self.compliance_logger.info(
            f"Content extraction validation - URL: {source_url} - "
            f"Content length: {len(content)} - "
            f"Compliant: {is_compliant} - "
            f"Score: {compliance_score:.2f} - "
            f"Issues: {len(issues)}"
        )
        
        return ComplianceResult(
            is_compliant=is_compliant,
            compliance_score=compliance_score,
            issues=issues,
            recommendations=recommendations
        )
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """
        Get usage statistics for compliance monitoring.
        
        Returns:
            Dictionary containing usage statistics
        """
        total_activities = len(self.activities)
        total_content_accessed = sum(
            activity.content_length for activity in self.activities
            if activity.content_accessed
        )
        
        # Calculate daily usage
        daily_stats = {}
        for date, usage in self.daily_usage_tracker.items():
            daily_stats[date] = {
                'total_content': usage,
                'limit_percentage': (usage / (self.config.max_content_length_per_source * 10)) * 100
            }
        
        # Calculate per-URL usage
        url_stats = {}
        for url, usage in self.content_usage_tracker.items():
            url_stats[url] = {
                'total_content': usage,
                'limit_percentage': (usage / self.config.max_content_length_per_source) * 100
            }
        
        return {
            'total_activities': total_activities,
            'total_content_accessed': total_content_accessed,
            'daily_usage': daily_stats,
            'url_usage': url_stats,
            'config': {
                'max_content_per_source': self.config.max_content_length_per_source,
                'max_sources_per_scale': self.config.max_sources_per_scale,
                'educational_purpose': self.config.educational_purpose_statement
            }
        }
    
    def export_compliance_log(self, output_path: str) -> bool:
        """
        Export compliance activities to a JSON file.
        
        Args:
            output_path: Path where the export should be saved
            
        Returns:
            True if export was successful
        """
        try:
            # Prepare data for export
            export_data = {
                'export_timestamp': datetime.now().isoformat(),
                'config': {
                    'educational_purpose_statement': self.config.educational_purpose_statement,
                    'max_content_length_per_source': self.config.max_content_length_per_source,
                    'max_sources_per_scale': self.config.max_sources_per_scale,
                    'respect_robots_txt': self.config.respect_robots_txt,
                    'user_agent': self.config.user_agent
                },
                'activities': [
                    {
                        'activity_type': activity.activity_type,
                        'url': activity.url,
                        'content_accessed': activity.content_accessed,
                        'educational_purpose': activity.educational_purpose,
                        'timestamp': activity.timestamp.isoformat(),
                        'content_length': activity.content_length
                    }
                    for activity in self.activities
                ],
                'usage_statistics': self.get_usage_statistics()
            }
            
            # Write to file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            self.compliance_logger.info(f"Compliance log exported to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to export compliance log: {e}")
            return False


class ComplianceReporter:
    """
    Generates comprehensive compliance reports for audit purposes.
    
    This class tracks fair use activity across all operations, implements
    compliance violation detection and alerts, and generates detailed
    reports for audit purposes.
    """
    
    def __init__(self, compliance_manager: FairUseComplianceManager):
        """
        Initialize the Compliance Reporter.
        
        Args:
            compliance_manager: The compliance manager to report on
        """
        self.compliance_manager = compliance_manager
        self.logger = logging.getLogger(__name__)
        self.violation_alerts: List[Dict[str, Any]] = []
        
    def track_fair_use_activity(self, 
                               activity_type: str,
                               url: str,
                               content_accessed: bool,
                               educational_purpose: str,
                               content_length: int = 0) -> None:
        """
        Track a fair use activity and check for violations.
        
        Args:
            activity_type: Type of activity being performed
            url: URL being accessed
            content_accessed: Whether content was accessed
            educational_purpose: Educational purpose of the activity
            content_length: Length of content accessed
        """
        # Create activity record
        activity = FairUseActivity(
            activity_type=activity_type,
            url=url,
            content_accessed=content_accessed,
            educational_purpose=educational_purpose,
            content_length=content_length
        )
        
        # Log the activity
        self.compliance_manager.log_fair_use_activity(activity)
        
        # Check for violations
        self._check_for_violations(activity)
    
    def _check_for_violations(self, activity: FairUseActivity) -> None:
        """
        Check an activity for compliance violations and generate alerts.
        
        Args:
            activity: Activity to check for violations
        """
        violations = []
        
        # Check educational purpose
        if not self.compliance_manager.validate_educational_purpose(activity.educational_purpose):
            violations.append({
                'type': 'non_educational_purpose',
                'description': 'Activity does not serve a clear educational purpose',
                'severity': 'high'
            })
        
        # Check content usage limits
        if activity.content_accessed and activity.content_length > 0:
            usage_check = self.compliance_manager.check_content_usage_limits(
                "x" * activity.content_length,
                activity.url
            )
            
            if not usage_check.within_limits:
                violations.append({
                    'type': 'content_usage_limit_exceeded',
                    'description': f'Content usage exceeds fair use limits: {usage_check.usage_percentage:.1f}%',
                    'severity': 'high' if usage_check.usage_percentage > 150 else 'medium'
                })
        
        # Check robots.txt compliance
        if not self.compliance_manager.check_robots_txt_compliance(activity.url):
            violations.append({
                'type': 'robots_txt_violation',
                'description': 'Access may violate robots.txt restrictions',
                'severity': 'medium'
            })
        
        # If violations found, create alert
        if violations:
            alert = {
                'timestamp': datetime.now(),
                'activity': activity,
                'violations': violations,
                'alert_id': f"alert_{len(self.violation_alerts) + 1}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            }
            
            self.violation_alerts.append(alert)
            
            # Log the alert
            self.logger.warning(
                f"COMPLIANCE VIOLATION ALERT - ID: {alert['alert_id']} - "
                f"Activity: {activity.activity_type} - "
                f"URL: {activity.url} - "
                f"Violations: {len(violations)}"
            )
            
            # Log each violation
            for violation in violations:
                self.compliance_manager.compliance_logger.warning(
                    f"VIOLATION - Type: {violation['type']} - "
                    f"Severity: {violation['severity']} - "
                    f"Description: {violation['description']} - "
                    f"Activity: {activity.activity_type} - "
                    f"URL: {activity.url}"
                )
    
    def generate_audit_report(self, 
                            start_date: Optional[datetime] = None,
                            end_date: Optional[datetime] = None,
                            include_detailed_activities: bool = True) -> Dict[str, Any]:
        """
        Generate a comprehensive audit report.
        
        Args:
            start_date: Start date for the report period
            end_date: End date for the report period
            include_detailed_activities: Whether to include detailed activity logs
            
        Returns:
            Comprehensive audit report
        """
        # Get compliance report from manager
        compliance_report = self.compliance_manager.generate_compliance_report(
            start_date, end_date
        )
        
        # Filter violations by date range
        if start_date and end_date:
            filtered_violations = [
                alert for alert in self.violation_alerts
                if start_date <= alert['timestamp'] <= end_date
            ]
        else:
            filtered_violations = self.violation_alerts
        
        # Calculate violation statistics
        violation_stats = self._calculate_violation_statistics(filtered_violations)
        
        # Get usage statistics
        usage_stats = self.compliance_manager.get_usage_statistics()
        
        # Create comprehensive audit report
        audit_report = {
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'report_period_start': (start_date or datetime.min).isoformat(),
                'report_period_end': (end_date or datetime.now()).isoformat(),
                'report_type': 'fair_use_compliance_audit'
            },
            'compliance_summary': {
                'total_activities': compliance_report.total_activities,
                'compliant_activities': compliance_report.compliant_activities,
                'non_compliant_activities': compliance_report.non_compliant_activities,
                'compliance_rate': (
                    compliance_report.compliant_activities / compliance_report.total_activities * 100
                    if compliance_report.total_activities > 0 else 0
                )
            },
            'violation_summary': violation_stats,
            'usage_statistics': usage_stats,
            'configuration': {
                'educational_purpose_statement': self.compliance_manager.config.educational_purpose_statement,
                'max_content_length_per_source': self.compliance_manager.config.max_content_length_per_source,
                'max_sources_per_scale': self.compliance_manager.config.max_sources_per_scale,
                'respect_robots_txt': self.compliance_manager.config.respect_robots_txt,
                'user_agent': self.compliance_manager.config.user_agent
            },
            'recommendations': self._generate_compliance_recommendations(
                compliance_report, violation_stats, usage_stats
            )
        }
        
        # Add detailed activities if requested
        if include_detailed_activities:
            audit_report['detailed_activities'] = [
                {
                    'activity_type': activity.activity_type,
                    'url': activity.url,
                    'content_accessed': activity.content_accessed,
                    'educational_purpose': activity.educational_purpose,
                    'timestamp': activity.timestamp.isoformat(),
                    'content_length': activity.content_length
                }
                for activity in compliance_report.activities
            ]
        
        # Add violation details
        audit_report['violation_details'] = [
            {
                'alert_id': alert['alert_id'],
                'timestamp': alert['timestamp'].isoformat(),
                'activity_type': alert['activity'].activity_type,
                'url': alert['activity'].url,
                'violations': alert['violations']
            }
            for alert in filtered_violations
        ]
        
        return audit_report
    
    def _calculate_violation_statistics(self, violations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics about compliance violations.
        
        Args:
            violations: List of violation alerts
            
        Returns:
            Violation statistics
        """
        if not violations:
            return {
                'total_violations': 0,
                'violation_types': {},
                'severity_breakdown': {},
                'most_common_violation': None,
                'violation_trend': []
            }
        
        # Count violation types
        violation_types = {}
        severity_counts = {'high': 0, 'medium': 0, 'low': 0}
        
        for alert in violations:
            for violation in alert['violations']:
                v_type = violation['type']
                v_severity = violation['severity']
                
                violation_types[v_type] = violation_types.get(v_type, 0) + 1
                severity_counts[v_severity] += 1
        
        # Find most common violation
        most_common_violation = max(violation_types.items(), key=lambda x: x[1])[0] if violation_types else None
        
        # Calculate violation trend (violations per day)
        violation_dates = {}
        for alert in violations:
            date_str = alert['timestamp'].strftime('%Y-%m-%d')
            violation_dates[date_str] = violation_dates.get(date_str, 0) + len(alert['violations'])
        
        violation_trend = [
            {'date': date, 'count': count}
            for date, count in sorted(violation_dates.items())
        ]
        
        return {
            'total_violations': sum(len(alert['violations']) for alert in violations),
            'total_violation_alerts': len(violations),
            'violation_types': violation_types,
            'severity_breakdown': severity_counts,
            'most_common_violation': most_common_violation,
            'violation_trend': violation_trend
        }
    
    def _generate_compliance_recommendations(self, 
                                           compliance_report: ComplianceReport,
                                           violation_stats: Dict[str, Any],
                                           usage_stats: Dict[str, Any]) -> List[str]:
        """
        Generate recommendations for improving compliance.
        
        Args:
            compliance_report: Compliance report data
            violation_stats: Violation statistics
            usage_stats: Usage statistics
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Compliance rate recommendations
        if compliance_report.total_activities > 0:
            compliance_rate = compliance_report.compliant_activities / compliance_report.total_activities
            
            if compliance_rate < 0.8:
                recommendations.append(
                    "Compliance rate is below 80%. Review educational purposes and content usage limits."
                )
            elif compliance_rate < 0.9:
                recommendations.append(
                    "Compliance rate could be improved. Consider refining activity descriptions."
                )
        
        # Violation-specific recommendations
        if violation_stats['total_violations'] > 0:
            most_common = violation_stats.get('most_common_violation')
            
            if most_common == 'content_usage_limit_exceeded':
                recommendations.append(
                    "Content usage limits are frequently exceeded. Consider reducing content extraction "
                    "or increasing the limit if educationally justified."
                )
            elif most_common == 'non_educational_purpose':
                recommendations.append(
                    "Activities are not clearly educational. Improve activity descriptions to "
                    "clearly state educational purposes."
                )
            elif most_common == 'robots_txt_violation':
                recommendations.append(
                    "Robots.txt violations detected. Ensure respect for website access restrictions."
                )
        
        # Usage pattern recommendations
        high_usage_urls = [
            url for url, stats in usage_stats.get('url_usage', {}).items()
            if stats['limit_percentage'] > 80
        ]
        
        if high_usage_urls:
            recommendations.append(
                f"High content usage detected for {len(high_usage_urls)} URLs. "
                "Consider distributing requests across more sources."
            )
        
        # Daily usage recommendations
        daily_usage = usage_stats.get('daily_usage', {})
        high_usage_days = [
            date for date, stats in daily_usage.items()
            if stats['limit_percentage'] > 50
        ]
        
        if high_usage_days:
            recommendations.append(
                "High daily usage detected. Consider spreading activities across more days "
                "to reduce daily content consumption."
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append(
                "Compliance appears good. Continue monitoring and maintaining current practices."
            )
        
        return recommendations
    
    def generate_markdown_report(self, 
                               audit_report: Dict[str, Any],
                               output_path: str) -> bool:
        """
        Generate a human-readable Markdown compliance report.
        
        Args:
            audit_report: Audit report data
            output_path: Path where the report should be saved
            
        Returns:
            True if report was generated successfully
        """
        try:
            markdown_content = self._create_markdown_content(audit_report)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            self.logger.info(f"Markdown compliance report generated: {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to generate Markdown report: {e}")
            return False
    
    def _create_markdown_content(self, audit_report: Dict[str, Any]) -> str:
        """
        Create Markdown content for the compliance report.
        
        Args:
            audit_report: Audit report data
            
        Returns:
            Markdown content as string
        """
        content = []
        
        # Header
        content.append("# Fair Use Compliance Audit Report")
        content.append("")
        content.append(f"**Generated:** {audit_report['report_metadata']['generated_at']}")
        content.append(f"**Report Period:** {audit_report['report_metadata']['report_period_start']} to {audit_report['report_metadata']['report_period_end']}")
        content.append("")
        
        # Executive Summary
        content.append("## Executive Summary")
        content.append("")
        summary = audit_report['compliance_summary']
        content.append(f"- **Total Activities:** {summary['total_activities']}")
        content.append(f"- **Compliant Activities:** {summary['compliant_activities']}")
        content.append(f"- **Non-Compliant Activities:** {summary['non_compliant_activities']}")
        content.append(f"- **Compliance Rate:** {summary['compliance_rate']:.1f}%")
        content.append("")
        
        # Violation Summary
        content.append("## Violation Summary")
        content.append("")
        violation_summary = audit_report['violation_summary']
        
        if violation_summary['total_violations'] == 0:
            content.append("✅ No compliance violations detected during the report period.")
        else:
            content.append(f"⚠️ **Total Violations:** {violation_summary['total_violations']}")
            content.append(f"**Total Violation Alerts:** {violation_summary['total_violation_alerts']}")
            content.append("")
            
            # Violation types
            content.append("### Violation Types")
            content.append("")
            for v_type, count in violation_summary['violation_types'].items():
                content.append(f"- **{v_type.replace('_', ' ').title()}:** {count}")
            content.append("")
            
            # Severity breakdown
            content.append("### Severity Breakdown")
            content.append("")
            severity = violation_summary['severity_breakdown']
            content.append(f"- **High:** {severity['high']}")
            content.append(f"- **Medium:** {severity['medium']}")
            content.append(f"- **Low:** {severity['low']}")
            content.append("")
        
        # Usage Statistics
        content.append("## Usage Statistics")
        content.append("")
        usage_stats = audit_report['usage_statistics']
        content.append(f"- **Total Content Accessed:** {usage_stats['total_content_accessed']} characters")
        content.append(f"- **Unique URLs Accessed:** {len(usage_stats.get('url_usage', {}))}")
        content.append("")
        
        # High usage URLs
        high_usage_urls = [
            (url, stats) for url, stats in usage_stats.get('url_usage', {}).items()
            if stats['limit_percentage'] > 50
        ]
        
        if high_usage_urls:
            content.append("### High Usage URLs")
            content.append("")
            for url, stats in sorted(high_usage_urls, key=lambda x: x[1]['limit_percentage'], reverse=True)[:10]:
                content.append(f"- **{url}:** {stats['limit_percentage']:.1f}% of limit")
            content.append("")
        
        # Configuration
        content.append("## Configuration")
        content.append("")
        config = audit_report['configuration']
        content.append(f"- **Educational Purpose:** {config['educational_purpose_statement']}")
        content.append(f"- **Max Content per Source:** {config['max_content_length_per_source']} characters")
        content.append(f"- **Max Sources per Scale:** {config['max_sources_per_scale']}")
        content.append(f"- **Respect Robots.txt:** {config['respect_robots_txt']}")
        content.append("")
        
        # Recommendations
        content.append("## Recommendations")
        content.append("")
        for i, recommendation in enumerate(audit_report['recommendations'], 1):
            content.append(f"{i}. {recommendation}")
        content.append("")
        
        # Violation Details (if any)
        if audit_report.get('violation_details'):
            content.append("## Violation Details")
            content.append("")
            
            for violation in audit_report['violation_details'][:20]:  # Limit to first 20
                content.append(f"### Alert ID: {violation['alert_id']}")
                content.append(f"**Timestamp:** {violation['timestamp']}")
                content.append(f"**Activity:** {violation['activity_type']}")
                content.append(f"**URL:** {violation['url']}")
                content.append("**Violations:**")
                
                for v in violation['violations']:
                    content.append(f"- **{v['type'].replace('_', ' ').title()}** ({v['severity']}): {v['description']}")
                
                content.append("")
        
        # Footer
        content.append("---")
        content.append("*This report was generated automatically by the Scale Existence Cleanup System Fair Use Compliance Manager.*")
        
        return "\n".join(content)
    
    def generate_json_report(self, 
                           audit_report: Dict[str, Any],
                           output_path: str) -> bool:
        """
        Generate a JSON compliance report for programmatic access.
        
        Args:
            audit_report: Audit report data
            output_path: Path where the report should be saved
            
        Returns:
            True if report was generated successfully
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(audit_report, f, indent=2, ensure_ascii=False, default=str)
            
            self.logger.info(f"JSON compliance report generated: {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to generate JSON report: {e}")
            return False
    
    def get_violation_alerts(self, 
                           severity: Optional[str] = None,
                           limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get violation alerts, optionally filtered by severity.
        
        Args:
            severity: Filter by severity level ('high', 'medium', 'low')
            limit: Maximum number of alerts to return
            
        Returns:
            List of violation alerts
        """
        alerts = self.violation_alerts
        
        # Filter by severity if specified
        if severity:
            alerts = [
                alert for alert in alerts
                if any(v['severity'] == severity for v in alert['violations'])
            ]
        
        # Sort by timestamp (most recent first)
        alerts = sorted(alerts, key=lambda x: x['timestamp'], reverse=True)
        
        # Apply limit if specified
        if limit:
            alerts = alerts[:limit]
        
        return alerts
    
    def clear_old_alerts(self, days_to_keep: int = 30) -> int:
        """
        Clear violation alerts older than specified days.
        
        Args:
            days_to_keep: Number of days of alerts to keep
            
        Returns:
            Number of alerts cleared
        """
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        original_count = len(self.violation_alerts)
        self.violation_alerts = [
            alert for alert in self.violation_alerts
            if alert['timestamp'] > cutoff_date
        ]
        
        cleared_count = original_count - len(self.violation_alerts)
        
        if cleared_count > 0:
            self.logger.info(f"Cleared {cleared_count} old violation alerts")
        
        return cleared_count