"""
Tests for the Backward Compatibility Validator.

This module tests the validation of JavaScript database modifications
for backward compatibility with existing scale library systems.
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open

from src.backward_compatibility_validator import BackwardCompatibilityValidator
from src.models import ScaleType


class TestBackwardCompatibilityValidator:
    """Test the backward compatibility validator."""
    
    @pytest.fixture
    def valid_js_content(self):
        """Valid JavaScript content for testing."""
        return """
class MusicTheoryEngine {
    constructor() {
        this.chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.noteValues = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
        
        this.keySignatures = {
            'C': { accidentals: [], type: 'natural' },
            'G': { accidentals: ['F#'], type: 'sharp' }
        };
        
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
            bebop_major: [0, 2, 4, 5, 7, 8, 9, 11]
        };
        
        this.scaleCitations = {
            major: {
                description: 'Ionian mode - fundamental to Western tonal music',
                culturalContext: {
                    region: "Western Europe",
                    culturalGroup: "European classical tradition"
                },
                references: [{
                    "type": "verified_source",
                    "title": "Major scale - Wikipedia"
                }]
            },
            raga_bhairav: {
                description: 'Indian classical raga',
                culturalContext: {
                    region: "India",
                    culturalGroup: "Indian classical tradition"
                },
                references: []
            }
        };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicTheoryEngine;
}
"""
    
    @pytest.fixture
    def invalid_js_content(self):
        """Invalid JavaScript content for testing."""
        return """
class MusicTheoryEngine {
    constructor() {
        this.scales = {
            invalid_scale: [0, 2, 4, 5, 7, 9, 11, 13],  // Invalid interval > 11
            empty_scale: [],  // Empty scale
            non_zero_start: [1, 3, 5, 7, 9, 11],  // Doesn't start with 0
        };
    }
    // Missing closing brace
"""
    
    @pytest.fixture
    def temp_js_file(self, valid_js_content):
        """Create a temporary JavaScript file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(valid_js_content)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    def test_validate_javascript_syntax_valid(self, temp_js_file):
        """Test JavaScript syntax validation with valid content."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_javascript_syntax()
        
        # Should pass or be skipped (if Node.js not available)
        assert result['status'] in ['passed', 'skipped']
        
        if result['status'] == 'passed':
            assert not result['errors']
    
    def test_validate_javascript_syntax_invalid(self, invalid_js_content):
        """Test JavaScript syntax validation with invalid content."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(invalid_js_content)
            temp_path = f.name
        
        try:
            validator = BackwardCompatibilityValidator(temp_path)
            result = validator._validate_javascript_syntax()
            
            # Should fail or be skipped (if Node.js not available)
            assert result['status'] in ['failed', 'skipped']
            
            if result['status'] == 'failed':
                assert result['errors']
        
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_validate_scale_structure_valid(self, temp_js_file):
        """Test scale structure validation with valid scales."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_scale_structure()
        
        assert result['status'] == 'passed'
        assert not result['errors']
        assert result['details']['total_scales'] > 0
        assert result['details']['valid_scales'] == result['details']['total_scales']
    
    def test_validate_scale_categorization(self, temp_js_file):
        """Test scale categorization validation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_scale_categorization()
        
        assert result['status'] == 'passed'
        assert not result['errors']
        assert 'type_distribution' in result['details']
        
        # Check that we have scales in different categories
        type_dist = result['details']['type_distribution']
        assert type_dist['traditional'] > 0
        assert type_dist['cultural'] > 0
        assert type_dist['modern'] > 0
    
    def test_validate_citation_metadata(self, temp_js_file):
        """Test citation metadata validation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_citation_metadata()
        
        assert result['status'] == 'passed'
        assert not result['errors']
        assert 'scales_with_citations' in result['details']
        assert 'scales_without_citations' in result['details']
        assert result['details']['scales_with_citations'] > 0
    
    def test_validate_class_structure(self, temp_js_file):
        """Test class structure validation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_class_structure()
        
        assert result['status'] == 'passed'
        assert not result['errors']
    
    def test_validate_class_structure_missing_elements(self):
        """Test class structure validation with missing elements."""
        incomplete_content = """
        // Missing class definition
        const scales = {
            major: [0, 2, 4, 5, 7, 9, 11]
        };
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(incomplete_content)
            temp_path = f.name
        
        try:
            validator = BackwardCompatibilityValidator(temp_path)
            result = validator._validate_class_structure()
            
            assert result['status'] == 'failed'
            assert result['errors']
            assert any('MusicTheoryEngine class' in error for error in result['errors'])
        
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_validate_export_compatibility(self, temp_js_file):
        """Test export compatibility validation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_export_compatibility()
        
        assert result['status'] == 'passed'
        # Should not have warnings about missing exports since our test content has them
    
    def test_validate_scale_integrity(self, temp_js_file):
        """Test scale integrity validation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_scale_integrity()
        
        assert result['status'] == 'passed'
        assert not result['errors']
        assert 'total_scales' in result['details']
    
    def test_validate_scale_integrity_with_issues(self):
        """Test scale integrity validation with problematic scales."""
        problematic_content = """
        class MusicTheoryEngine {
            constructor() {
                this.scales = {
                    duplicate1: [0, 2, 4, 5, 7, 9, 11],
                    duplicate2: [0, 2, 4, 5, 7, 9, 11],  // Same intervals as duplicate1
                    descending: [0, 11, 9, 7, 5, 4, 2],  // Not ascending
                    too_short: [0, 7],  // Very short
                    too_long: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]  // Too long
                };
                
                this.scaleCitations = {};
            }
        }
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(problematic_content)
            temp_path = f.name
        
        try:
            validator = BackwardCompatibilityValidator(temp_path)
            result = validator._validate_scale_integrity()
            
            # Should have warnings about duplicates and scale lengths
            assert result['warnings']
            assert any('Duplicate scale' in warning for warning in result['warnings'])
            assert any('Very short scale' in warning for warning in result['warnings'])
            assert any('Very long scale' in warning for warning in result['warnings'])
            
            # Should have errors about non-ascending intervals
            assert result['errors']
            assert any('not in ascending order' in error for error in result['errors'])
        
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_validate_full_compatibility_valid(self, temp_js_file):
        """Test full compatibility validation with valid content."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        results = validator.validate_full_compatibility()
        
        assert results['overall_status'] in ['passed', 'passed_with_warnings']
        assert 'validations' in results
        assert len(results['validations']) > 0
        
        # Check that all major validation categories are present
        expected_validations = [
            'javascript_syntax',
            'scale_structure',
            'scale_categorization',
            'citation_metadata',
            'class_structure',
            'export_compatibility',
            'scale_integrity'
        ]
        
        for validation in expected_validations:
            assert validation in results['validations']
    
    def test_generate_compatibility_report(self, temp_js_file):
        """Test compatibility report generation."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        results = validator.validate_full_compatibility()
        report = validator.generate_compatibility_report(results)
        
        assert isinstance(report, str)
        assert len(report) > 0
        assert "Backward Compatibility Validation Report" in report
        assert "Overall Status:" in report
        assert "Validations:" in report
    
    def test_file_not_found(self):
        """Test handling of non-existent file."""
        validator = BackwardCompatibilityValidator('/non/existent/file.js')
        result = validator._validate_javascript_syntax()
        
        assert result['status'] == 'failed'
        assert result['errors']
        assert any('does not exist' in error for error in result['errors'])
    
    @patch('subprocess.run')
    def test_javascript_validation_with_node_success(self, mock_run, temp_js_file):
        """Test JavaScript validation when Node.js is available and succeeds."""
        mock_run.return_value.returncode = 0
        mock_run.return_value.stderr = ""
        
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_javascript_syntax()
        
        assert result['status'] == 'passed'
        assert not result['errors']
    
    @patch('subprocess.run')
    def test_javascript_validation_with_node_failure(self, mock_run, temp_js_file):
        """Test JavaScript validation when Node.js is available and fails."""
        mock_run.return_value.returncode = 1
        mock_run.return_value.stderr = "SyntaxError: Unexpected token"
        
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_javascript_syntax()
        
        assert result['status'] == 'failed'
        assert result['errors']
        assert any('SyntaxError' in error for error in result['errors'])
    
    @patch('subprocess.run', side_effect=FileNotFoundError())
    def test_javascript_validation_without_node(self, mock_run, temp_js_file):
        """Test JavaScript validation when Node.js is not available."""
        validator = BackwardCompatibilityValidator(temp_js_file)
        result = validator._validate_javascript_syntax()
        
        assert result['status'] == 'skipped'
        assert result['warnings']
        assert any('Node.js not available' in warning for warning in result['warnings'])