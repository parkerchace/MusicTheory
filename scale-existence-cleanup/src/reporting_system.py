"""
Reporting system for the Scale Existence Cleanup System.

This module implements comprehensive reporting and statistics generation
including detailed removal reports, database quality improvement statistics,
and dual-format report generation (JSON and Markdown).
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import asdict

try:
    # Try relative imports first (when used as module)
    from .interfaces import ReportingInterface, ReportingError
    from .models import (
except ImportError:
    # Fall back to absolute imports (when run as script)
    from interfaces import ReportingInterface, ReportingError
    from models import (
    RemovalReport, RemovalResult, ScaleData, SearchResult, QualityAssessment,
    RemovalDecision, ScaleType, SourceType
)
try:
    # Try relative imports first (when used as module)
    from .config import SystemConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from config import SystemConfig


class ComprehensiveReportingSystem(ReportingInterface):
    """
    Comprehensive reporting system that generates detailed reports in multiple formats.
    
    This system provides detailed removal reports, database quality improvement
    statistics, and supports both JSON and Markdown output formats.
    """
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the reporting system.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.ComprehensiveReportingSystem")
        self.report_dir = Path(config.reporting.report_directory)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        # Statistics tracking
        self.report_generation_stats = {
            'reports_generated': 0,
            'json_reports': 0,
            'markdown_reports': 0,
            'errors': 0
        }
    
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
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Add metadata to the report
            report_data = {
                'report_metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'generator': 'Scale Existence Cleanup System',
                    'version': '1.0.0',
                    'format': 'json'
                },
                'data': data
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False, default=self._json_serializer)
            
            self.report_generation_stats['reports_generated'] += 1
            self.report_generation_stats['json_reports'] += 1
            
            self.logger.info(f"Generated JSON report: {output_path}")
            return True
        
        except Exception as e:
            self.report_generation_stats['errors'] += 1
            self.logger.error(f"Failed to generate JSON report: {e}")
            raise ReportingError(f"JSON report generation failed: {e}")
    
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
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            markdown_content = self._generate_markdown_content(data)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            self.report_generation_stats['reports_generated'] += 1
            self.report_generation_stats['markdown_reports'] += 1
            
            self.logger.info(f"Generated Markdown report: {output_path}")
            return True
        
        except Exception as e:
            self.report_generation_stats['errors'] += 1
            self.logger.error(f"Failed to generate Markdown report: {e}")
            raise ReportingError(f"Markdown report generation failed: {e}")
    
    def format_validation_report_markdown(self, report_data: Dict[str, Any]) -> str:
        """
        Format validation report data as Markdown.
        
        Args:
            report_data: Validation report data
            
        Returns:
            Formatted Markdown string
        """
        md_lines = []
        
        # Header
        md_lines.append("# Scale Validation Report")
        md_lines.append("")
        md_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md_lines.append("")
        
        # Summary
        summary = report_data.get('summary', {})
        md_lines.append("## Summary")
        md_lines.append("")
        md_lines.append(f"- **Total Scales Processed**: {summary.get('total_scales', 0)}")
        md_lines.append(f"- **Successful Validations**: {summary.get('successful_validations', 0)}")
        md_lines.append(f"- **Failed Validations**: {summary.get('failed_validations', 0)}")
        md_lines.append("")
        
        # Validation Results
        results = report_data.get('validation_results', [])
        if results:
            md_lines.append("## Validation Results")
            md_lines.append("")
            
            for result in results:
                if 'error' in result:
                    scale_name = getattr(result.get('scale'), 'name', 'Unknown')
                    md_lines.append(f"### ❌ {scale_name}")
                    md_lines.append(f"**Error**: {result['error']}")
                    md_lines.append("")
                else:
                    scale = result.get('scale')
                    scale_name = getattr(scale, 'name', 'Unknown')
                    search_results = result.get('search_results', [])
                    quality_assessments = result.get('quality_assessments', [])
                    
                    md_lines.append(f"### ✅ {scale_name}")
                    md_lines.append(f"**Sources Found**: {len(search_results)}")
                    
                    if quality_assessments:
                        avg_quality = sum(qa.quality_score for qa in quality_assessments if hasattr(qa, 'quality_score')) / len(quality_assessments)
                        md_lines.append(f"**Average Quality Score**: {avg_quality:.2f}")
                    
                    md_lines.append("")
        
        return "\n".join(md_lines)
    
    def format_cleanup_report_markdown(self, report_data: Dict[str, Any]) -> str:
        """
        Format cleanup report data as Markdown.
        
        Args:
            report_data: Cleanup report data
            
        Returns:
            Formatted Markdown string
        """
        md_lines = []
        
        # Header
        md_lines.append("# Scale Cleanup Report")
        md_lines.append("")
        md_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md_lines.append("")
        
        # Summary
        summary = report_data.get('summary', {})
        cleanup_results = report_data.get('cleanup_results', {})
        
        md_lines.append("## Summary")
        md_lines.append("")
        md_lines.append(f"- **Total Scales Processed**: {summary.get('total_scales_processed', 0)}")
        md_lines.append(f"- **Scales Removed**: {summary.get('scales_removed', 0)}")
        md_lines.append(f"- **Scales Kept**: {summary.get('scales_kept', 0)}")
        
        if summary.get('dry_run', False):
            md_lines.append("- **Mode**: Dry Run (no changes made)")
        else:
            md_lines.append("- **Mode**: Live Run (changes applied)")
        
        md_lines.append("")
        
        # Removed Scales
        removed_scales = cleanup_results.get('removed_scales', [])
        if removed_scales:
            md_lines.append("## Removed Scales")
            md_lines.append("")
            
            for scale, decision in removed_scales:
                scale_name = getattr(scale, 'name', 'Unknown')
                md_lines.append(f"### ❌ {scale_name}")
                md_lines.append(f"**Confidence**: {decision.confidence:.2f}")
                
                if hasattr(decision, 'reasons') and decision.reasons:
                    md_lines.append("**Reasons**:")
                    for reason in decision.reasons:
                        md_lines.append(f"- {reason}")
                
                md_lines.append("")
        
        # Kept Scales
        kept_scales = cleanup_results.get('kept_scales', [])
        if kept_scales and len(kept_scales) <= 20:  # Only show if not too many
            md_lines.append("## Kept Scales")
            md_lines.append("")
            
            for scale, decision in kept_scales:
                scale_name = getattr(scale, 'name', 'Unknown')
                md_lines.append(f"### ✅ {scale_name}")
                md_lines.append(f"**Confidence**: {decision.confidence:.2f}")
                md_lines.append("")
        
        return "\n".join(md_lines)
    
    def generate_summary_statistics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate summary statistics from data.
        
        Args:
            data: Data to analyze
            
        Returns:
            Dictionary of summary statistics
        """
        try:
            stats = {
                'generation_timestamp': datetime.now().isoformat(),
                'data_summary': {},
                'quality_metrics': {},
                'performance_metrics': {}
            }
            
            # Analyze removal data if present
            if 'removal_report' in data:
                removal_report = data['removal_report']
                stats['data_summary'] = {
                    'total_scales_processed': removal_report.get('total_scales_processed', 0),
                    'scales_removed': removal_report.get('scales_removed', 0),
                    'scales_flagged': removal_report.get('scales_flagged', 0),
                    'processing_time_seconds': removal_report.get('processing_time_seconds', 0.0)
                }
                
                # Calculate quality metrics
                total_processed = stats['data_summary']['total_scales_processed']
                if total_processed > 0:
                    stats['quality_metrics'] = {
                        'removal_rate': stats['data_summary']['scales_removed'] / total_processed,
                        'flag_rate': stats['data_summary']['scales_flagged'] / total_processed,
                        'retention_rate': 1.0 - (stats['data_summary']['scales_removed'] / total_processed)
                    }
            
            # Analyze search results if present
            if 'search_statistics' in data:
                search_stats = data['search_statistics']
                stats['performance_metrics'].update({
                    'total_searches': search_stats.get('total_searches', 0),
                    'successful_searches': search_stats.get('successful_searches', 0),
                    'average_relevance_score': search_stats.get('average_relevance_score', 0.0),
                    'search_success_rate': (
                        search_stats.get('successful_searches', 0) / 
                        max(search_stats.get('total_searches', 1), 1)
                    )
                })
            
            # Analyze scale type distribution if present
            if 'scale_analysis' in data:
                scale_analysis = data['scale_analysis']
                stats['data_summary']['scale_type_distribution'] = scale_analysis.get('type_distribution', {})
                stats['data_summary']['cultural_distribution'] = scale_analysis.get('cultural_distribution', {})
            
            return stats
        
        except Exception as e:
            self.logger.error(f"Failed to generate summary statistics: {e}")
            return {'error': str(e), 'generation_timestamp': datetime.now().isoformat()}
    
    def generate_removal_report(self, removal_results: List[RemovalResult], 
                              processing_stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a comprehensive removal report.
        
        Args:
            removal_results: List of removal results
            processing_stats: Processing statistics
            
        Returns:
            Comprehensive removal report data
        """
        try:
            report_data = {
                'report_type': 'scale_removal_report',
                'generated_at': datetime.now().isoformat(),
                'summary': {
                    'total_removals_attempted': len(removal_results),
                    'successful_removals': len([r for r in removal_results if r.success]),
                    'failed_removals': len([r for r in removal_results if not r.success]),
                    'backups_created': len([r for r in removal_results if r.backup_created]),
                    'processing_time_seconds': processing_stats.get('processing_time_seconds', 0.0)
                },
                'removal_details': [],
                'failure_analysis': {},
                'backup_information': {},
                'recommendations': []
            }
            
            # Process individual removal results
            for result in removal_results:
                detail = {
                    'scale_id': result.scale_id,
                    'success': result.success,
                    'reason': result.removal_reason,
                    'timestamp': result.timestamp.isoformat(),
                    'backup_created': result.backup_created,
                    'backup_location': result.backup_location if result.backup_created else None
                }
                report_data['removal_details'].append(detail)
            
            # Analyze failures
            failed_results = [r for r in removal_results if not r.success]
            if failed_results:
                failure_reasons = {}
                for result in failed_results:
                    reason = result.removal_reason
                    failure_reasons[reason] = failure_reasons.get(reason, 0) + 1
                
                report_data['failure_analysis'] = {
                    'total_failures': len(failed_results),
                    'failure_reasons': failure_reasons,
                    'failure_rate': len(failed_results) / len(removal_results) if removal_results else 0
                }
            
            # Backup information
            backup_results = [r for r in removal_results if r.backup_created]
            if backup_results:
                report_data['backup_information'] = {
                    'total_backups_created': len(backup_results),
                    'backup_locations': [r.backup_location for r in backup_results if r.backup_location],
                    'backup_success_rate': len(backup_results) / len(removal_results) if removal_results else 0
                }
            
            # Generate recommendations
            report_data['recommendations'] = self._generate_recommendations(
                removal_results, processing_stats
            )
            
            return report_data
        
        except Exception as e:
            self.logger.error(f"Failed to generate removal report: {e}")
            raise ReportingError(f"Removal report generation failed: {e}")
    
    def generate_quality_improvement_report(self, before_stats: Dict[str, Any], 
                                          after_stats: Dict[str, Any],
                                          removal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a database quality improvement report.
        
        Args:
            before_stats: Statistics before cleanup
            after_stats: Statistics after cleanup
            removal_data: Data about what was removed
            
        Returns:
            Quality improvement report data
        """
        try:
            report_data = {
                'report_type': 'quality_improvement_report',
                'generated_at': datetime.now().isoformat(),
                'before_cleanup': before_stats,
                'after_cleanup': after_stats,
                'improvements': {},
                'quality_metrics': {},
                'impact_analysis': {}
            }
            
            # Calculate improvements
            before_total = before_stats.get('total_scales', 0)
            after_total = after_stats.get('total_scales', 0)
            removed_count = before_total - after_total
            
            report_data['improvements'] = {
                'scales_removed': removed_count,
                'removal_percentage': (removed_count / before_total * 100) if before_total > 0 else 0,
                'database_size_reduction': removed_count,
                'quality_score_improvement': self._calculate_quality_improvement(before_stats, after_stats)
            }
            
            # Quality metrics
            report_data['quality_metrics'] = {
                'documentation_coverage_before': before_stats.get('documented_scales_percentage', 0),
                'documentation_coverage_after': after_stats.get('documented_scales_percentage', 0),
                'source_quality_before': before_stats.get('average_source_quality', 0),
                'source_quality_after': after_stats.get('average_source_quality', 0),
                'educational_source_percentage_before': before_stats.get('educational_sources_percentage', 0),
                'educational_source_percentage_after': after_stats.get('educational_sources_percentage', 0)
            }
            
            # Impact analysis
            report_data['impact_analysis'] = {
                'scale_types_affected': removal_data.get('scale_types_removed', {}),
                'cultural_origins_affected': removal_data.get('cultural_origins_removed', {}),
                'most_common_removal_reasons': removal_data.get('removal_reasons', {}),
                'quality_threshold_impact': self._analyze_quality_threshold_impact(removal_data)
            }
            
            return report_data
        
        except Exception as e:
            self.logger.error(f"Failed to generate quality improvement report: {e}")
            raise ReportingError(f"Quality improvement report generation failed: {e}")
    
    def save_dual_format_report(self, report_data: Dict[str, Any], base_filename: str) -> Dict[str, str]:
        """
        Save a report in both JSON and Markdown formats.
        
        Args:
            report_data: Report data to save
            base_filename: Base filename (without extension)
            
        Returns:
            Dictionary with paths to generated files
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            base_name = f"{base_filename}_{timestamp}"
            
            json_path = self.report_dir / f"{base_name}.json"
            markdown_path = self.report_dir / f"{base_name}.md"
            
            file_paths = {}
            
            # Generate JSON report
            if self.config.reporting.generate_json_reports:
                if self.generate_json_report(report_data, str(json_path)):
                    file_paths['json'] = str(json_path)
            
            # Generate Markdown report
            if self.config.reporting.generate_markdown_reports:
                if self.generate_markdown_report(report_data, str(markdown_path)):
                    file_paths['markdown'] = str(markdown_path)
            
            self.logger.info(f"Generated dual-format report: {base_name}")
            return file_paths
        
        except Exception as e:
            self.logger.error(f"Failed to save dual-format report: {e}")
            raise ReportingError(f"Dual-format report generation failed: {e}")
    
    def _generate_markdown_content(self, data: Dict[str, Any]) -> str:
        """
        Generate Markdown content from report data.
        
        Args:
            data: Report data
            
        Returns:
            Markdown content string
        """
        lines = []
        
        # Header
        lines.append("# Scale Existence Cleanup Report")
        lines.append("")
        lines.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        # Summary section
        if 'summary' in data:
            lines.append("## Summary")
            lines.append("")
            summary = data['summary']
            
            for key, value in summary.items():
                formatted_key = key.replace('_', ' ').title()
                lines.append(f"- **{formatted_key}**: {value}")
            lines.append("")
        
        # Removal details
        if 'removal_details' in data:
            lines.append("## Removal Details")
            lines.append("")
            
            removal_details = data['removal_details']
            if removal_details:
                lines.append("| Scale ID | Success | Reason | Backup Created |")
                lines.append("|----------|---------|--------|----------------|")
                
                for detail in removal_details:
                    success_icon = "✅" if detail['success'] else "❌"
                    backup_icon = "✅" if detail.get('backup_created', False) else "❌"
                    lines.append(f"| {detail['scale_id']} | {success_icon} | {detail['reason']} | {backup_icon} |")
                lines.append("")
            else:
                lines.append("No removal details available.")
                lines.append("")
        
        # Failure analysis
        if 'failure_analysis' in data and data['failure_analysis']:
            lines.append("## Failure Analysis")
            lines.append("")
            
            failure_analysis = data['failure_analysis']
            lines.append(f"- **Total Failures**: {failure_analysis.get('total_failures', 0)}")
            lines.append(f"- **Failure Rate**: {failure_analysis.get('failure_rate', 0):.2%}")
            lines.append("")
            
            if 'failure_reasons' in failure_analysis:
                lines.append("### Failure Reasons")
                lines.append("")
                for reason, count in failure_analysis['failure_reasons'].items():
                    lines.append(f"- {reason}: {count}")
                lines.append("")
        
        # Quality metrics
        if 'quality_metrics' in data:
            lines.append("## Quality Metrics")
            lines.append("")
            
            quality_metrics = data['quality_metrics']
            for key, value in quality_metrics.items():
                formatted_key = key.replace('_', ' ').title()
                if isinstance(value, float):
                    lines.append(f"- **{formatted_key}**: {value:.2%}")
                else:
                    lines.append(f"- **{formatted_key}**: {value}")
            lines.append("")
        
        # Recommendations
        if 'recommendations' in data and data['recommendations']:
            lines.append("## Recommendations")
            lines.append("")
            
            for i, recommendation in enumerate(data['recommendations'], 1):
                lines.append(f"{i}. {recommendation}")
            lines.append("")
        
        # Data summary
        if 'data_summary' in data:
            lines.append("## Data Summary")
            lines.append("")
            
            data_summary = data['data_summary']
            for key, value in data_summary.items():
                formatted_key = key.replace('_', ' ').title()
                if isinstance(value, dict):
                    lines.append(f"### {formatted_key}")
                    lines.append("")
                    for sub_key, sub_value in value.items():
                        lines.append(f"- {sub_key}: {sub_value}")
                    lines.append("")
                else:
                    lines.append(f"- **{formatted_key}**: {value}")
            lines.append("")
        
        return "\n".join(lines)
    
    def _json_serializer(self, obj):
        """Custom JSON serializer for complex objects."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            return asdict(obj) if hasattr(obj, '__dataclass_fields__') else obj.__dict__
        elif isinstance(obj, (ScaleType, SourceType)):
            return obj.value
        else:
            return str(obj)
    
    def _generate_recommendations(self, removal_results: List[RemovalResult], 
                                processing_stats: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on removal results."""
        recommendations = []
        
        # Analyze failure rate
        if removal_results:
            failure_rate = len([r for r in removal_results if not r.success]) / len(removal_results)
            
            if failure_rate > 0.1:
                recommendations.append(
                    "High failure rate detected. Consider reviewing removal criteria and database integrity."
                )
            
            # Analyze backup success
            backup_rate = len([r for r in removal_results if r.backup_created]) / len(removal_results)
            if backup_rate < 0.9:
                recommendations.append(
                    "Some removals were performed without backups. Ensure backup system is functioning properly."
                )
        
        # Processing time recommendations
        processing_time = processing_stats.get('processing_time_seconds', 0)
        if processing_time > 300:  # 5 minutes
            recommendations.append(
                "Processing time is high. Consider optimizing search queries or implementing batch processing."
            )
        
        # General recommendations
        recommendations.extend([
            "Review flagged scales manually to ensure no valuable scales were incorrectly marked for removal.",
            "Monitor database quality metrics over time to track improvement trends.",
            "Consider adjusting removal criteria based on the results of this cleanup operation."
        ])
        
        return recommendations
    
    def _calculate_quality_improvement(self, before_stats: Dict[str, Any], 
                                     after_stats: Dict[str, Any]) -> float:
        """Calculate overall quality improvement score."""
        try:
            before_quality = before_stats.get('overall_quality_score', 0.5)
            after_quality = after_stats.get('overall_quality_score', 0.5)
            
            improvement = after_quality - before_quality
            return improvement
        except Exception:
            return 0.0
    
    def _analyze_quality_threshold_impact(self, removal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the impact of quality thresholds on removals."""
        try:
            return {
                'scales_below_minimum_quality': removal_data.get('low_quality_removals', 0),
                'scales_lacking_educational_sources': removal_data.get('non_educational_removals', 0),
                'scales_with_insufficient_documentation': removal_data.get('undocumented_removals', 0),
                'threshold_effectiveness': removal_data.get('threshold_effectiveness_score', 0.0)
            }
        except Exception:
            return {}
    
    def get_reporting_statistics(self) -> Dict[str, Any]:
        """Get statistics about report generation."""
        return {
            'reports_generated': self.report_generation_stats['reports_generated'],
            'json_reports': self.report_generation_stats['json_reports'],
            'markdown_reports': self.report_generation_stats['markdown_reports'],
            'errors': self.report_generation_stats['errors'],
            'success_rate': (
                (self.report_generation_stats['reports_generated'] - self.report_generation_stats['errors']) /
                max(self.report_generation_stats['reports_generated'], 1)
            )
        }