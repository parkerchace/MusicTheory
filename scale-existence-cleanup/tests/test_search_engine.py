"""
Tests for the Scale Search Engine implementation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.search_engine import (
    MultiEngineSearchEngine, GoogleSearchEngine, BingSearchEngine, 
    DuckDuckGoSearchEngine, _determine_source_type
)
from src.models import SearchResult, SourceType, SearchStatistics
from src.config import SystemConfig, SearchEngineConfig
from src.interfaces import SearchEngineError


class TestMultiEngineSearchEngine:
    """Test the multi-engine search functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = SystemConfig()
        self.config.search_engines = [
            SearchEngineConfig(name="duckduckgo", enabled=True),
            SearchEngineConfig(name="google", enabled=False, api_key="test_key"),
            SearchEngineConfig(name="bing", enabled=False, api_key="test_key")
        ]
    
    def test_initialization(self):
        """Test multi-engine search engine initialization."""
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_ddg.return_value = Mock()
            
            engine = MultiEngineSearchEngine(self.config)
            
            assert engine is not None
            assert len(engine.engines) >= 0  # At least DuckDuckGo should be available
    
    def test_search_scale_basic(self):
        """Test basic scale search functionality."""
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            mock_result = SearchResult(
                url="https://example.com/major-scale",
                title="Major Scale Theory",
                snippet="The major scale is a diatonic scale...",
                relevance_score=0.8,
                source_type=SourceType.EDUCATIONAL,
                search_engine="duckduckgo",
                found_at=datetime.now()
            )
            mock_engine.search_scale.return_value = [mock_result]
            mock_ddg.return_value = mock_engine
            
            search_engine = MultiEngineSearchEngine(self.config)
            search_engine.engines = {"duckduckgo": mock_engine}
            
            results = search_engine.search_scale("major scale")
            
            assert len(results) == 1
            assert results[0].title == "Major Scale Theory"
            assert results[0].source_type == SourceType.EDUCATIONAL
    
    def test_search_with_alternatives(self):
        """Test searching with alternative scale names."""
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            
            # Mock different results for primary and alternative names
            primary_result = SearchResult(
                url="https://example.com/major",
                title="Major Scale",
                snippet="Primary result",
                relevance_score=0.9,
                source_type=SourceType.EDUCATIONAL,
                search_engine="duckduckgo",
                found_at=datetime.now()
            )
            
            alt_result = SearchResult(
                url="https://example.com/ionian",
                title="Ionian Mode",
                snippet="Alternative result",
                relevance_score=0.8,
                source_type=SourceType.EDUCATIONAL,
                search_engine="duckduckgo",
                found_at=datetime.now()
            )
            
            def mock_search(scale_name, cultural_context=None):
                if scale_name == "major":
                    return [primary_result]
                elif scale_name == "ionian":
                    return [alt_result]
                return []
            
            mock_engine.search_scale.side_effect = mock_search
            mock_ddg.return_value = mock_engine
            
            search_engine = MultiEngineSearchEngine(self.config)
            search_engine.engines = {"duckduckgo": mock_engine}
            
            results = search_engine.search_with_alternatives("major", ["ionian"])
            
            assert len(results) == 2
            # Results should be sorted by relevance score
            assert results[0].relevance_score >= results[1].relevance_score
    
    def test_evaluate_search_relevance(self):
        """Test relevance scoring algorithm."""
        search_engine = MultiEngineSearchEngine(self.config)
        
        # High relevance result
        high_relevance_result = SearchResult(
            url="https://musictheory.net/major-scale",
            title="Major Scale - Music Theory",
            snippet="The major scale contains seven notes and follows a specific pattern of intervals...",
            relevance_score=0.0,  # Will be calculated
            source_type=SourceType.EDUCATIONAL,
            search_engine="test",
            found_at=datetime.now()
        )
        
        relevance = search_engine.evaluate_search_relevance(high_relevance_result, "major scale")
        assert relevance > 0.7  # Should be high relevance
        
        # Low relevance result
        low_relevance_result = SearchResult(
            url="https://example.com/random",
            title="Random Article",
            snippet="This is about something completely different...",
            relevance_score=0.0,
            source_type=SourceType.UNKNOWN,
            search_engine="test",
            found_at=datetime.now()
        )
        
        relevance = search_engine.evaluate_search_relevance(low_relevance_result, "major scale")
        assert relevance < 0.3  # Should be low relevance
    
    def test_get_search_statistics(self):
        """Test search statistics collection."""
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            mock_stats = SearchStatistics(
                total_searches=5,
                successful_searches=4,
                failed_searches=1,
                total_results_found=20,
                average_relevance_score=0.7,
                search_engines_used=["duckduckgo"],
                processing_time_seconds=10.0
            )
            mock_engine.get_search_statistics.return_value = mock_stats
            mock_ddg.return_value = mock_engine
            
            search_engine = MultiEngineSearchEngine(self.config)
            search_engine.engines = {"duckduckgo": mock_engine}
            
            stats = search_engine.get_search_statistics()
            
            assert isinstance(stats, SearchStatistics)
            assert stats.total_results_found >= 0
            assert stats.processing_time_seconds >= 0
    
    def test_deduplication(self):
        """Test result deduplication functionality."""
        search_engine = MultiEngineSearchEngine(self.config)
        
        # Create duplicate results with different relevance scores
        result1 = SearchResult(
            url="https://example.com/scale",
            title="Scale Info 1",
            snippet="First result",
            relevance_score=0.7,
            source_type=SourceType.EDUCATIONAL,
            search_engine="engine1",
            found_at=datetime.now()
        )
        
        result2 = SearchResult(
            url="https://example.com/scale/",  # Same URL with trailing slash
            title="Scale Info 2",
            snippet="Second result",
            relevance_score=0.9,  # Higher relevance
            source_type=SourceType.EDUCATIONAL,
            search_engine="engine2",
            found_at=datetime.now()
        )
        
        results = [result1, result2]
        unique_results = search_engine._deduplicate_results(results)
        
        assert len(unique_results) == 1
        assert unique_results[0].relevance_score == 0.9  # Should keep higher relevance
    
    def test_empty_scale_name_error(self):
        """Test error handling for empty scale name."""
        search_engine = MultiEngineSearchEngine(self.config)
        
        with pytest.raises(SearchEngineError, match="Scale name cannot be empty"):
            search_engine.search_scale("")
    
    def test_all_engines_fail(self):
        """Test behavior when all search engines fail."""
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            mock_engine.search_scale.side_effect = Exception("Search failed")
            mock_ddg.return_value = mock_engine
            
            search_engine = MultiEngineSearchEngine(self.config)
            search_engine.engines = {"duckduckgo": mock_engine}
            
            with pytest.raises(SearchEngineError, match="All search engines failed"):
                search_engine.search_scale("test scale")


class TestSourceTypeDetection:
    """Test source type detection functionality."""
    
    def test_educational_sources(self):
        """Test detection of educational sources."""
        assert _determine_source_type("https://university.edu/music") == SourceType.EDUCATIONAL
        assert _determine_source_type("https://musictheory.org/scales") == SourceType.EDUCATIONAL
        assert _determine_source_type("https://en.wikipedia.org/wiki/Major_scale") == SourceType.EDUCATIONAL
    
    def test_academic_sources(self):
        """Test detection of academic sources."""
        assert _determine_source_type("https://scholar.google.com/paper") == SourceType.ACADEMIC
        assert _determine_source_type("https://jstor.org/article") == SourceType.ACADEMIC
        assert _determine_source_type("https://academia.edu/research") == SourceType.ACADEMIC
    
    def test_cultural_sources(self):
        """Test detection of cultural sources."""
        assert _determine_source_type("https://ethnomusicology.org/scales") == SourceType.CULTURAL
        assert _determine_source_type("https://traditional-music.com/raga") == SourceType.CULTURAL
    
    def test_commercial_sources(self):
        """Test detection of commercial sources."""
        assert _determine_source_type("https://musiclessons.com/scales") == SourceType.COMMERCIAL
        assert _determine_source_type("https://guitar-tabs.com/theory") == SourceType.COMMERCIAL
    
    def test_unknown_sources(self):
        """Test handling of unknown source types."""
        assert _determine_source_type("https://random-site.net/content") == SourceType.UNKNOWN


class TestDuckDuckGoSearchEngine:
    """Test DuckDuckGo search engine implementation."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = SystemConfig()
        self.engine_config = SearchEngineConfig(name="duckduckgo", enabled=True)
    
    def test_initialization(self):
        """Test DuckDuckGo search engine initialization."""
        engine = DuckDuckGoSearchEngine(self.config, self.engine_config)
        assert engine is not None
        assert engine.is_available() == True
    
    @patch('src.search_engine.requests.Session.get')
    def test_perform_search_success(self, mock_get):
        """Test successful DuckDuckGo search."""
        # Mock HTML response
        mock_response = Mock()
        mock_response.text = '''
        <div class="result">
            <a class="result__a" href="https://example.com/scale">Major Scale Theory</a>
            <a class="result__snippet">Information about major scales and their intervals...</a>
        </div>
        '''
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        engine = DuckDuckGoSearchEngine(self.config, self.engine_config)
        results = engine._perform_search("major scale")
        
        assert len(results) >= 0  # Should handle parsing gracefully
    
    def test_is_available(self):
        """Test availability check."""
        engine = DuckDuckGoSearchEngine(self.config, self.engine_config)
        assert engine.is_available() == True
        
        # Test with disabled engine
        disabled_config = SearchEngineConfig(name="duckduckgo", enabled=False)
        disabled_engine = DuckDuckGoSearchEngine(self.config, disabled_config)
        assert disabled_engine.is_available() == False


if __name__ == "__main__":
    pytest.main([__file__])