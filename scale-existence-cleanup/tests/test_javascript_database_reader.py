"""
Tests for the JavaScript Database Reader.

This module tests the parsing of JavaScript scale definitions and conversion
to Python data structures.
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open

from src.javascript_database_reader import (
    JavaScriptScaleParser, 
    JavaScriptDatabaseReader, 
    ScaleCitation
)
from src.models import ScaleType


class TestJavaScriptScaleParser:
    """Test the JavaScript scale parser."""
    
    def test_extract_scales_object_basic(self):
        """Test extraction of basic scales object."""
        js_content = """
        class MusicTheoryEngine {
            constructor() {
                this.scales = {
                    major: [0, 2, 4, 5, 7, 9, 11],
                    minor: [0, 2, 3, 5, 7, 8, 10],
                    dorian: [0, 2, 3, 5, 7, 9, 10]
                };
            }
        }
        """
        
        parser = JavaScriptScaleParser()
        scales = parser._extract_scales_object(js_content)
        
        assert len(scales) == 3
        assert scales['major'] == [0, 2, 4, 5, 7, 9, 11]
        assert scales['minor'] == [0, 2, 3, 5, 7, 8, 10]
        assert scales['dorian'] == [0, 2, 3, 5, 7, 9, 10]
    
    def test_extract_scales_object_with_comments(self):
        """Test extraction with comments in the scales object."""
        js_content = """
        this.scales = {
            // Western Major & Modes
            major: [0, 2, 4, 5, 7, 9, 11],
            // Minor scales
            minor: [0, 2, 3, 5, 7, 8, 10]
        };
        """
        
        parser = JavaScriptScaleParser()
        scales = parser._extract_scales_object(js_content)
        
        assert len(scales) == 2
        assert scales['major'] == [0, 2, 4, 5, 7, 9, 11]
        assert scales['minor'] == [0, 2, 3, 5, 7, 8, 10]
    
    def test_extract_citations_object_basic(self):
        """Test extraction of basic citations object."""
        js_content = """
        this.scaleCitations = {
            major: {
                description: 'Ionian mode - fundamental to Western tonal music',
                culturalContext: {
                    region: "Western Europe",
                    culturalGroup: "European classical tradition"
                },
                references: [{
                    "type": "verified_source",
                    "title": "Major scale - Wikipedia",
                    "url": "https://en.wikipedia.org/wiki/major_scale"
                }]
            }
        };
        """
        
        parser = JavaScriptScaleParser()
        citations = parser._extract_citations_object(js_content)
        
        assert len(citations) == 1
        assert 'major' in citations
        
        major_citation = citations['major']
        assert major_citation.description == 'Ionian mode - fundamental to Western tonal music'
        assert major_citation.cultural_context['region'] == 'Western Europe'
        assert major_citation.cultural_context['culturalGroup'] == 'European classical tradition'
        assert len(major_citation.references) == 1
        assert major_citation.references[0]['type'] == 'verified_source'
    
    def test_intervals_to_notes(self):
        """Test conversion of intervals to note names."""
        parser = JavaScriptScaleParser()
        
        # Test C major scale
        intervals = [0, 2, 4, 5, 7, 9, 11]
        notes = parser._intervals_to_notes(intervals, 'C')
        expected = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        assert notes == expected
        
        # Test G major scale
        notes = parser._intervals_to_notes(intervals, 'G')
        expected = ['G', 'A', 'B', 'C', 'D', 'E', 'F#']
        assert notes == expected
    
    def test_determine_scale_type(self):
        """Test scale type determination."""
        parser = JavaScriptScaleParser()
        
        # Traditional scales
        assert parser._determine_scale_type('major', None) == ScaleType.TRADITIONAL
        assert parser._determine_scale_type('dorian', None) == ScaleType.TRADITIONAL
        assert parser._determine_scale_type('minor', None) == ScaleType.TRADITIONAL
        
        # Cultural scales
        assert parser._determine_scale_type('raga_bhairav', None) == ScaleType.CULTURAL
        assert parser._determine_scale_type('maqam_bayati', None) == ScaleType.CULTURAL
        assert parser._determine_scale_type('pentatonic_african', None) == ScaleType.CULTURAL
        
        # Modern scales
        assert parser._determine_scale_type('bebop_major', None) == ScaleType.MODERN
        assert parser._determine_scale_type('altered', None) == ScaleType.MODERN
        assert parser._determine_scale_type('whole_tone', None) == ScaleType.MODERN
        
        # Test with citation context
        citation = ScaleCitation(
            description="Test scale",
            cultural_context={'region': 'Africa', 'culturalGroup': 'Traditional'},
            references=[]
        )
        assert parser._determine_scale_type('test_scale', citation) == ScaleType.CULTURAL
    
    def test_generate_scale_id(self):
        """Test scale ID generation."""
        parser = JavaScriptScaleParser()
        
        assert parser._generate_scale_id('major') == 'major'
        assert parser._generate_scale_id('raga_bhairav') == 'raga_bhairav'
        assert parser._generate_scale_id('C# major') == 'c_major'
        assert parser._generate_scale_id('Dorian b2') == 'dorian_b2'
        assert parser._generate_scale_id('') == 'unknown_scale'


class TestJavaScriptDatabaseReader:
    """Test the JavaScript database reader."""
    
    @pytest.fixture
    def sample_js_content(self):
        """Sample JavaScript content for testing."""
        return """
        class MusicTheoryEngine {
            constructor() {
                this.scales = {
                    major: [0, 2, 4, 5, 7, 9, 11],
                    minor: [0, 2, 3, 5, 7, 8, 10],
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
        """
    
    def test_read_all_scales(self, sample_js_content):
        """Test reading all scales from a JavaScript file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(sample_js_content)
            temp_path = f.name
        
        try:
            reader = JavaScriptDatabaseReader(temp_path)
            scales = reader.read_all_scales()
            
            assert len(scales) == 4
            
            # Check that we have the expected scales
            scale_names = [scale.name for scale in scales]
            assert 'major' in scale_names
            assert 'minor' in scale_names
            assert 'raga_bhairav' in scale_names
            assert 'bebop_major' in scale_names
            
            # Check scale data
            major_scale = next(s for s in scales if s.name == 'major')
            assert major_scale.intervals == [0, 2, 4, 5, 7, 9, 11]
            assert major_scale.scale_type == ScaleType.TRADITIONAL
            assert major_scale.cultural_origin == 'Western Europe'
            
            raga_scale = next(s for s in scales if s.name == 'raga_bhairav')
            assert raga_scale.intervals == [0, 1, 4, 5, 7, 8, 11]
            assert raga_scale.scale_type == ScaleType.CULTURAL
            assert raga_scale.cultural_origin == 'India'
        
        finally:
            Path(temp_path).unlink()
    
    def test_read_scales_by_type(self, sample_js_content):
        """Test reading scales filtered by type."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(sample_js_content)
            temp_path = f.name
        
        try:
            reader = JavaScriptDatabaseReader(temp_path)
            
            # Test traditional scales
            traditional_scales = reader.read_scales_by_type(ScaleType.TRADITIONAL)
            traditional_names = [s.name for s in traditional_scales]
            assert 'major' in traditional_names
            assert 'minor' in traditional_names
            assert 'raga_bhairav' not in traditional_names
            
            # Test cultural scales
            cultural_scales = reader.read_scales_by_type(ScaleType.CULTURAL)
            cultural_names = [s.name for s in cultural_scales]
            assert 'raga_bhairav' in cultural_names
            assert 'major' not in cultural_names
            
            # Test modern scales
            modern_scales = reader.read_scales_by_type(ScaleType.MODERN)
            modern_names = [s.name for s in modern_scales]
            assert 'bebop_major' in modern_names
        
        finally:
            Path(temp_path).unlink()
    
    def test_get_scale_by_name(self, sample_js_content):
        """Test getting a specific scale by name."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(sample_js_content)
            temp_path = f.name
        
        try:
            reader = JavaScriptDatabaseReader(temp_path)
            
            # Test existing scale
            major_scale = reader.get_scale_by_name('major')
            assert major_scale is not None
            assert major_scale.name == 'major'
            assert major_scale.intervals == [0, 2, 4, 5, 7, 9, 11]
            
            # Test non-existing scale
            non_existing = reader.get_scale_by_name('non_existing_scale')
            assert non_existing is None
        
        finally:
            Path(temp_path).unlink()
    
    def test_get_database_statistics(self, sample_js_content):
        """Test getting database statistics."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(sample_js_content)
            temp_path = f.name
        
        try:
            reader = JavaScriptDatabaseReader(temp_path)
            stats = reader.get_database_statistics()
            
            assert stats['total_scales'] == 4
            assert stats['scales_by_type']['traditional'] == 2
            assert stats['scales_by_type']['cultural'] == 1
            assert stats['scales_by_type']['modern'] == 1
            assert stats['scales_with_citations'] == 2  # major and raga_bhairav have citations
            assert stats['scales_without_citations'] == 2  # minor and bebop_major don't
            assert stats['database_file'] == temp_path
        
        finally:
            Path(temp_path).unlink()
    
    def test_file_not_found(self):
        """Test handling of non-existent file."""
        reader = JavaScriptDatabaseReader('/non/existent/file.js')
        
        with pytest.raises(Exception):  # Should raise DatabaseError
            reader.read_all_scales()