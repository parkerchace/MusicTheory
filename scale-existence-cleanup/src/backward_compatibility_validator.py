"""
Backward Compatibility Validator for the Scale Existence Cleanup System.

This module ensures that modified JavaScript files maintain compatibility
with existing scale library systems and preserve all necessary metadata.
"""

import re
import json
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
import tempfile

from .javascript_database_reader import JavaScriptDatabaseReader
from .models import ScaleData, ScaleType
from .interfaces import DatabaseError


class BackwardCompatibilityValidator:
    """
    Validator for ensuring backward compatibility of modified JavaScript databases.
    
    This class performs comprehensive validation to ensure that modifications
    to the JavaScript scale database don't break existing functionality.
    """
    
    def __init__(self, database_file_path: str):
        """
        Initialize the compatibility validator.
        
        Args:
            database_file_path: Path to the JavaScript database file
        """
        self.database_file_path = Path(database_file_path)
        self.logger = logging.getLogger(f"{__name__}.BackwardCompatibilityValidator")
        self.reader = JavaScriptDatabaseReader(str(database_file_path))
    
    def validate_full_compatibility(self) -> Dict[str, Any]:
        """
        Perform comprehensive backward compatibility validation.
        
        Returns:
            Dictionary containing validation results
        """
        results = {
            'overall_status': 'unknown',
            'validations': {},
            'errors': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            # 1. JavaScript syntax validation
            syntax_result = self._validate_javascript_syntax()
            results['validations']['javascript_syntax'] = syntax_result
            
            # 2. Scale data structure validation
            structure_result = self._validate_scale_structure()
            results['validations']['scale_structure'] = structure_result
            
            # 3. Scale categorization validation
            categorization_result = self._validate_scale_categorization()
            results['validations']['scale_categorization'] = categorization_result
            
            # 4. Citation metadata validation
            citation_result = self._validate_citation_metadata()
            results['validations']['citation_metadata'] = citation_result
            
            # 5. Class structure validation
            class_result = self._validate_class_structure()
            results['validations']['class_structure'] = class_result
            
            # 6. Export compatibility validation
            export_result = self._validate_export_compatibility()
            results['validations']['export_compatibility'] = export_result
            
            # 7. Scale integrity validation
            integrity_result = self._validate_scale_integrity()
            results['validations']['scale_integrity'] = integrity_result
            
            # Determine overall status
            all_passed = all(
                result.get('status') == 'passed' 
                for result in results['validations'].values()
            )
            
            has_warnings = any(
                result.get('warnings', []) 
                for result in results['validations'].values()
            )
            
            if all_passed:
                results['overall_status'] = 'passed_with_warnings' if has_warnings else 'passed'
            else:
                results['overall_status'] = 'failed'
            
            # Collect all errors and warnings
            for validation_name, validation_result in results['validations'].items():
                if validation_result.get('errors'):
                    results['errors'].extend([
                        f"{validation_name}: {error}" 
                        for error in validation_result['errors']
                    ])
                
                if validation_result.get('warnings'):
                    results['warnings'].extend([
                        f"{validation_name}: {warning}" 
                        for warning in validation_result['warnings']
                    ])
                
                if validation_result.get('recommendations'):
                    results['recommendations'].extend([
                        f"{validation_name}: {rec}" 
                        for rec in validation_result['recommendations']
                    ])
            
            self.logger.info(f"Compatibility validation completed: {results['overall_status']}")
            
        except Exception as e:
            self.logger.error(f"Compatibility validation failed: {e}")
            results['overall_status'] = 'error'
            results['errors'].append(f"Validation error: {e}")
        
        return results
    
    def _validate_javascript_syntax(self) -> Dict[str, Any]:
        """Validate JavaScript syntax correctness."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            if not self.database_file_path.exists():
                result['status'] = 'failed'
                result['errors'].append("Database file does not exist")
                return result
            
            # Try to validate with Node.js
            try:
                process_result = subprocess.run(
                    ['node', '-c', str(self.database_file_path)],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if process_result.returncode == 0:
                    result['status'] = 'passed'
                else:
                    result['status'] = 'failed'
                    result['errors'].append(f"JavaScript syntax error: {process_result.stderr}")
            
            except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
                result['status'] = 'skipped'
                result['warnings'].append("Node.js not available for syntax validation")
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Syntax validation error: {e}")
        
        return result
    
    def _validate_scale_structure(self) -> Dict[str, Any]:
        """Validate that scale data structures are correct."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': [],
            'details': {}
        }
        
        try:
            scales = self.reader.read_all_scales()
            
            if not scales:
                result['status'] = 'failed'
                result['errors'].append("No scales found in database")
                return result
            
            valid_scales = 0
            invalid_scales = []
            
            for scale in scales:
                scale_valid = True
                scale_issues = []
                
                # Check required fields
                if not scale.name:
                    scale_issues.append("Missing scale name")
                    scale_valid = False
                
                if not scale.intervals:
                    scale_issues.append("Missing intervals")
                    scale_valid = False
                
                if not scale.notes:
                    scale_issues.append("Missing notes")
                    scale_valid = False
                
                # Check interval validity
                if scale.intervals:
                    if not all(isinstance(interval, int) for interval in scale.intervals):
                        scale_issues.append("Non-integer intervals found")
                        scale_valid = False
                    
                    if not all(0 <= interval <= 11 for interval in scale.intervals):
                        scale_issues.append("Intervals outside valid range (0-11)")
                        scale_valid = False
                    
                    if scale.intervals[0] != 0:
                        scale_issues.append("Scale should start with interval 0")
                        scale_valid = False
                
                # Check notes validity
                if scale.notes:
                    valid_notes = {'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'}
                    invalid_notes = [note for note in scale.notes if note not in valid_notes]
                    if invalid_notes:
                        scale_issues.append(f"Invalid note names: {invalid_notes}")
                        scale_valid = False
                
                # Check scale type
                if not isinstance(scale.scale_type, ScaleType):
                    scale_issues.append("Invalid scale type")
                    scale_valid = False
                
                if scale_valid:
                    valid_scales += 1
                else:
                    invalid_scales.append({
                        'name': scale.name,
                        'issues': scale_issues
                    })
            
            result['details'] = {
                'total_scales': len(scales),
                'valid_scales': valid_scales,
                'invalid_scales': len(invalid_scales),
                'invalid_scale_details': invalid_scales
            }
            
            if invalid_scales:
                result['status'] = 'failed'
                result['errors'].extend([
                    f"Scale '{scale['name']}': {', '.join(scale['issues'])}"
                    for scale in invalid_scales
                ])
            else:
                result['status'] = 'passed'
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Scale structure validation error: {e}")
        
        return result
    
    def _validate_scale_categorization(self) -> Dict[str, Any]:
        """Validate that scales are properly categorized."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': [],
            'details': {}
        }
        
        try:
            scales = self.reader.read_all_scales()
            
            # Count scales by type
            type_counts = {}
            for scale_type in ScaleType:
                type_counts[scale_type.value] = 0
            
            uncategorized_scales = []
            
            for scale in scales:
                if scale.scale_type:
                    type_counts[scale.scale_type.value] += 1
                else:
                    uncategorized_scales.append(scale.name)
            
            result['details'] = {
                'type_distribution': type_counts,
                'uncategorized_scales': uncategorized_scales
            }
            
            # Check for reasonable distribution
            total_scales = len(scales)
            if total_scales > 0:
                traditional_ratio = type_counts['traditional'] / total_scales
                cultural_ratio = type_counts['cultural'] / total_scales
                modern_ratio = type_counts['modern'] / total_scales
                
                # Warn if distribution seems unusual
                if traditional_ratio < 0.1:
                    result['warnings'].append("Very few traditional scales found")
                
                if cultural_ratio < 0.1:
                    result['warnings'].append("Very few cultural scales found")
                
                if modern_ratio > 0.8:
                    result['warnings'].append("Unusually high proportion of modern scales")
            
            if uncategorized_scales:
                result['status'] = 'failed'
                result['errors'].append(f"Uncategorized scales found: {uncategorized_scales}")
            else:
                result['status'] = 'passed'
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Scale categorization validation error: {e}")
        
        return result
    
    def _validate_citation_metadata(self) -> Dict[str, Any]:
        """Validate citation metadata integrity."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': [],
            'details': {}
        }
        
        try:
            scales = self.reader.read_all_scales()
            
            scales_with_citations = 0
            scales_without_citations = 0
            citation_issues = []
            
            for scale in scales:
                has_citations = 'references' in scale.metadata and scale.metadata['references']
                
                if has_citations:
                    scales_with_citations += 1
                    
                    # Validate citation structure
                    references = scale.metadata['references']
                    for i, ref in enumerate(references):
                        if not isinstance(ref, dict):
                            citation_issues.append(f"Scale '{scale.name}': Reference {i} is not a dictionary")
                            continue
                        
                        # Check for required fields
                        if 'type' not in ref:
                            citation_issues.append(f"Scale '{scale.name}': Reference {i} missing 'type' field")
                        
                        if 'title' not in ref:
                            citation_issues.append(f"Scale '{scale.name}': Reference {i} missing 'title' field")
                else:
                    scales_without_citations += 1
            
            result['details'] = {
                'scales_with_citations': scales_with_citations,
                'scales_without_citations': scales_without_citations,
                'citation_coverage': scales_with_citations / len(scales) if scales else 0,
                'citation_issues': citation_issues
            }
            
            # Check citation coverage
            citation_coverage = scales_with_citations / len(scales) if scales else 0
            if citation_coverage < 0.5:
                result['warnings'].append(f"Low citation coverage: {citation_coverage:.1%}")
            
            if citation_issues:
                result['status'] = 'failed'
                result['errors'].extend(citation_issues)
            else:
                result['status'] = 'passed'
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Citation metadata validation error: {e}")
        
        return result
    
    def _validate_class_structure(self) -> Dict[str, Any]:
        """Validate that the JavaScript class structure is preserved."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            with open(self.database_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for class definition
            if 'class MusicTheoryEngine' not in content:
                result['errors'].append("MusicTheoryEngine class definition not found")
            
            # Check for constructor
            if 'constructor()' not in content:
                result['errors'].append("Constructor method not found")
            
            # Check for scales property
            if 'this.scales' not in content:
                result['errors'].append("this.scales property not found")
            
            # Check for scaleCitations property
            if 'this.scaleCitations' not in content:
                result['warnings'].append("this.scaleCitations property not found")
            
            # Check for other essential properties
            essential_properties = [
                'this.chromaticNotes',
                'this.noteValues',
                'this.keySignatures'
            ]
            
            for prop in essential_properties:
                if prop not in content:
                    result['warnings'].append(f"Essential property {prop} not found")
            
            if result['errors']:
                result['status'] = 'failed'
            else:
                result['status'] = 'passed'
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Class structure validation error: {e}")
        
        return result
    
    def _validate_export_compatibility(self) -> Dict[str, Any]:
        """Validate that module exports are preserved for compatibility."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': []
        }
        
        try:
            with open(self.database_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for module export patterns
            export_patterns = [
                r'module\.exports\s*=',
                r'exports\.',
                r'export\s+',
                r'export\s+default'
            ]
            
            has_exports = any(re.search(pattern, content) for pattern in export_patterns)
            
            if not has_exports:
                result['warnings'].append("No module export patterns found - may affect Node.js compatibility")
            
            # Check for browser compatibility
            if 'typeof window !== \'undefined\'' in content:
                result['recommendations'].append("Browser compatibility checks found")
            
            # Check for CommonJS compatibility
            if 'typeof require !== \'undefined\'' in content:
                result['recommendations'].append("CommonJS compatibility checks found")
            
            result['status'] = 'passed'
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Export compatibility validation error: {e}")
        
        return result
    
    def _validate_scale_integrity(self) -> Dict[str, Any]:
        """Validate the mathematical integrity of scale definitions."""
        result = {
            'status': 'unknown',
            'errors': [],
            'warnings': [],
            'recommendations': [],
            'details': {}
        }
        
        try:
            scales = self.reader.read_all_scales()
            
            integrity_issues = []
            duplicate_scales = []
            
            # Check for duplicate scale definitions
            scale_signatures = {}
            for scale in scales:
                signature = tuple(scale.intervals)
                if signature in scale_signatures:
                    duplicate_scales.append({
                        'scales': [scale_signatures[signature], scale.name],
                        'intervals': scale.intervals
                    })
                else:
                    scale_signatures[signature] = scale.name
            
            # Check for mathematical consistency
            for scale in scales:
                if len(scale.intervals) != len(scale.notes):
                    integrity_issues.append(
                        f"Scale '{scale.name}': Interval count ({len(scale.intervals)}) "
                        f"doesn't match note count ({len(scale.notes)})"
                    )
                
                # Check for ascending intervals
                if scale.intervals != sorted(scale.intervals):
                    integrity_issues.append(f"Scale '{scale.name}': Intervals are not in ascending order")
                
                # Check for reasonable scale length
                if len(scale.intervals) < 3:
                    result['warnings'].append(f"Scale '{scale.name}': Very short scale ({len(scale.intervals)} notes)")
                elif len(scale.intervals) > 12:
                    result['warnings'].append(f"Scale '{scale.name}': Very long scale ({len(scale.intervals)} notes)")
            
            result['details'] = {
                'total_scales': len(scales),
                'duplicate_scales': duplicate_scales,
                'integrity_issues': integrity_issues
            }
            
            if integrity_issues:
                result['status'] = 'failed'
                result['errors'].extend(integrity_issues)
            else:
                result['status'] = 'passed'
            
            if duplicate_scales:
                result['warnings'].extend([
                    f"Duplicate scale intervals found: {dup['scales']} have intervals {dup['intervals']}"
                    for dup in duplicate_scales
                ])
            
        except Exception as e:
            result['status'] = 'error'
            result['errors'].append(f"Scale integrity validation error: {e}")
        
        return result
    
    def generate_compatibility_report(self, validation_results: Dict[str, Any]) -> str:
        """
        Generate a human-readable compatibility report.
        
        Args:
            validation_results: Results from validate_full_compatibility()
            
        Returns:
            Formatted report string
        """
        report_lines = [
            "Backward Compatibility Validation Report",
            "=" * 50,
            f"Overall Status: {validation_results['overall_status'].upper()}",
            ""
        ]
        
        # Summary
        total_validations = len(validation_results['validations'])
        passed_validations = sum(
            1 for result in validation_results['validations'].values()
            if result.get('status') == 'passed'
        )
        
        report_lines.extend([
            f"Validations: {passed_validations}/{total_validations} passed",
            f"Errors: {len(validation_results['errors'])}",
            f"Warnings: {len(validation_results['warnings'])}",
            ""
        ])
        
        # Detailed results
        for validation_name, result in validation_results['validations'].items():
            status = result.get('status', 'unknown').upper()
            report_lines.append(f"{validation_name}: {status}")
            
            if result.get('errors'):
                for error in result['errors']:
                    report_lines.append(f"  ERROR: {error}")
            
            if result.get('warnings'):
                for warning in result['warnings']:
                    report_lines.append(f"  WARNING: {warning}")
            
            if result.get('recommendations'):
                for rec in result['recommendations']:
                    report_lines.append(f"  INFO: {rec}")
            
            report_lines.append("")
        
        # Overall errors and warnings
        if validation_results['errors']:
            report_lines.extend([
                "CRITICAL ISSUES:",
                "-" * 20
            ])
            for error in validation_results['errors']:
                report_lines.append(f"• {error}")
            report_lines.append("")
        
        if validation_results['warnings']:
            report_lines.extend([
                "WARNINGS:",
                "-" * 20
            ])
            for warning in validation_results['warnings']:
                report_lines.append(f"• {warning}")
            report_lines.append("")
        
        if validation_results['recommendations']:
            report_lines.extend([
                "RECOMMENDATIONS:",
                "-" * 20
            ])
            for rec in validation_results['recommendations']:
                report_lines.append(f"• {rec}")
            report_lines.append("")
        
        return "\n".join(report_lines)