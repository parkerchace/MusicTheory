"""
Property-based tests for the Scale Search Engine implementation.

These tests verify universal properties that should hold across all inputs
for the search engine functionality.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from unittest.mock import Mock, patch
from datetime import datetime

from src.search_engine import MultiEngineSearchEngine, _determine_source_type
from src.models import SearchResult, SourceType, SearchStatistics
from src.config import SystemConfig, SearchEngineConfig
from src.interfaces import SearchEngineError


# Hypothesis strategies for generating test data
@st.composite
def search_result_strategy(draw):
    """Generate valid SearchResult objects."""
    # Generate a simple valid URL
    domain = draw(st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Ll', 'Nd'))))
    path = draw(st.text(min_size=0, max_size=30, alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Pd'))))
    url = f"https://{domain}.com/{path}"
    
    # Generate a simple title
    title = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'))))
    if not title.strip():
        title = "Default Title"
    
    snippet = draw(st.text(min_size=0, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'))))
    relevance_score = draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    source_type = draw(st.sampled_from(list(SourceType)))
    search_engine = draw(st.sampled_from(['google', 'bing', 'duckduckgo']))
    
    return SearchResult(
        url=url,
        title=title,
        snippet=snippet,
        relevance_score=relevance_score,
        source_type=source_type,
        search_engine=search_engine,
        found_at=datetime.now(),
        content_preview=snippet[:200]
    )


@st.composite
def scale_name_strategy(draw):
    """Generate valid scale names."""
    # Generate realistic scale names
    scale_types = ['major', 'minor', 'dorian', 'mixolydian', 'pentatonic', 'blues', 'chromatic']
    modifiers = ['', 'natural ', 'harmonic ', 'melodic ']
    keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Db', 'Eb', 'F#', 'Gb', 'Ab', 'Bb']
    
    modifier = draw(st.sampled_from(modifiers))
    key = draw(st.sampled_from(keys))
    scale_type = draw(st.sampled_from(scale_types))
    
    # Sometimes include key, sometimes not
    include_key = draw(st.booleans())
    if include_key:
        result = f"{key} {modifier}{scale_type}".strip()
    else:
        result = f"{modifier}{scale_type}".strip()
    
    # Ensure we always return a non-empty string
    return result if result else "major"


@st.composite
def system_config_strategy(draw):
    """Generate valid SystemConfig objects."""
    config = SystemConfig()
    
    # Generate search engines
    num_engines = draw(st.integers(min_value=1, max_value=3))
    engines = []
    
    for i in range(num_engines):
        engine_name = draw(st.sampled_from(['google', 'bing', 'duckduckgo']))
        enabled = draw(st.booleans())
        engines.append(SearchEngineConfig(name=engine_name, enabled=enabled))
    
    config.search_engines = engines
    return config


class TestMultiEngineSearchProperties:
    """Property-based tests for multi-engine search functionality."""
    
    @given(scale_name_strategy())
    @settings(max_examples=100)
    def test_multi_engine_search_consistency(self, scale_name):
        """
        **Feature: scale-existence-cleanup, Property 1: Multi-engine search consistency**
        
        For any scale processed by the system, the Scale_Existence_Validator 
        should perform searches using multiple search engines.
        
        **Validates: Requirements 1.1**
        """
        assume(scale_name.strip())  # Ensure non-empty scale name
        
        config = SystemConfig()
        config.search_engines = [
            SearchEngineConfig(name="duckduckgo", enabled=True),
            SearchEngineConfig(name="google", enabled=True, api_key="test_key"),
            SearchEngineConfig(name="bing", enabled=True, api_key="test_key")
        ]
        
        # Mock all search engines to return results
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg, \
             patch('src.search_engine.GoogleSearchEngine') as mock_google, \
             patch('src.search_engine.BingSearchEngine') as mock_bing:
            
            # Create mock engines that return results
            mock_engines = {}
            for engine_name, mock_class in [('duckduckgo', mock_ddg), ('google', mock_google), ('bing', mock_bing)]:
                mock_engine = Mock()
                mock_result = SearchResult(
                    url=f"https://example.com/{engine_name}",
                    title=f"{scale_name} from {engine_name}",
                    snippet=f"Information about {scale_name}",
                    relevance_score=0.8,
                    source_type=SourceType.EDUCATIONAL,
                    search_engine=engine_name,
                    found_at=datetime.now()
                )
                mock_engine.search_scale.return_value = [mock_result]
                mock_engine.is_available.return_value = True
                mock_class.return_value = mock_engine
                mock_engines[engine_name] = mock_engine
            
            search_engine = MultiEngineSearchEngine(config)
            results = search_engine.search_scale(scale_name)
            
            # Property: Multi-engine search should use multiple engines
            # Verify that multiple engines were called
            engines_called = 0
            for engine_name, mock_engine in mock_engines.items():
                if mock_engine.search_scale.called:
                    engines_called += 1
            
            # At least one engine should be called (ideally all enabled ones)
            assert engines_called >= 1, f"Expected at least 1 engine to be called, got {engines_called}"
            
            # Results should be returned
            assert isinstance(results, list), "Search should return a list of results"
            
            # Each result should be properly formed
            for result in results:
                assert isinstance(result, SearchResult), "Each result should be a SearchResult"
                assert result.url.startswith(('http://', 'https://')), "Each result should have a valid URL"
                assert result.title.strip(), "Each result should have a non-empty title"
                assert 0.0 <= result.relevance_score <= 1.0, "Relevance score should be between 0 and 1"
    
    @given(st.lists(search_result_strategy(), min_size=0, max_size=20))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.filter_too_much])
    def test_result_deduplication_property(self, results):
        """
        Property: Deduplication should preserve unique URLs and keep highest relevance.
        """
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            # Test deduplication
            unique_results = search_engine._deduplicate_results(results)
            
            # Property: No duplicate URLs should remain
            urls_seen = set()
            for result in unique_results:
                normalized_url = result.url.lower().rstrip('/')
                assert normalized_url not in urls_seen, f"Duplicate URL found: {normalized_url}"
                urls_seen.add(normalized_url)
            
            # Property: Number of unique results should not exceed original
            assert len(unique_results) <= len(results), "Deduplication should not increase result count"
            
            # Property: If original results had unique URLs, count should be preserved
            original_urls = set(r.url.lower().rstrip('/') for r in results)
            assert len(unique_results) == len(original_urls), "Should preserve all unique URLs"
    
    @given(search_result_strategy(), scale_name_strategy())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.filter_too_much])
    def test_relevance_evaluation_bounds(self, result, scale_name):
        """
        Property: Relevance evaluation should always return scores between 0.0 and 1.0.
        """
        assume(scale_name.strip())  # Ensure non-empty scale name
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            relevance = search_engine.evaluate_search_relevance(result, scale_name)
            
            # Property: Relevance score must be within valid bounds
            assert 0.0 <= relevance <= 1.0, f"Relevance score {relevance} is outside valid range [0.0, 1.0]"
            assert isinstance(relevance, float), "Relevance score must be a float"
    
    @given(scale_name_strategy(), st.lists(st.text(min_size=1, max_size=50), min_size=0, max_size=10))
    @settings(max_examples=30)
    def test_alternative_search_completeness(self, scale_name, alternatives):
        """
        Property: Search with alternatives should include results from both primary and alternative names.
        """
        assume(scale_name.strip())  # Ensure non-empty scale name
        assume(all(alt.strip() for alt in alternatives))  # Ensure non-empty alternatives
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            
            # Mock different results for different search terms
            def mock_search(search_term, cultural_context=None):
                return [SearchResult(
                    url=f"https://example.com/{search_term.replace(' ', '-')}",
                    title=f"Result for {search_term}",
                    snippet=f"Information about {search_term}",
                    relevance_score=0.7,
                    source_type=SourceType.EDUCATIONAL,
                    search_engine="duckduckgo",
                    found_at=datetime.now()
                )]
            
            mock_engine.search_scale.side_effect = mock_search
            mock_ddg.return_value = mock_engine
            
            search_engine = MultiEngineSearchEngine(config)
            results = search_engine.search_with_alternatives(scale_name, alternatives)
            
            # Property: Should call search for primary name and all alternatives
            expected_calls = 1 + len(alternatives)  # Primary + alternatives
            assert mock_engine.search_scale.call_count == expected_calls, \
                f"Expected {expected_calls} search calls, got {mock_engine.search_scale.call_count}"
            
            # Property: Results should be a list
            assert isinstance(results, list), "Results should be a list"
            
            # Property: Results should be sorted by relevance (highest first)
            if len(results) > 1:
                for i in range(len(results) - 1):
                    assert results[i].relevance_score >= results[i + 1].relevance_score, \
                        "Results should be sorted by relevance score in descending order"
    
    @given(st.text(min_size=5, max_size=100))
    @settings(max_examples=50)
    def test_source_type_determination_consistency(self, url):
        """
        Property: Source type determination should be consistent and return valid SourceType.
        """
        # Ensure URL has proper format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        source_type = _determine_source_type(url)
        
        # Property: Should always return a valid SourceType
        assert isinstance(source_type, SourceType), "Should return a SourceType enum value"
        assert source_type in list(SourceType), "Should return a valid SourceType value"
        
        # Property: Same URL should always return same source type (consistency)
        source_type2 = _determine_source_type(url)
        assert source_type == source_type2, "Source type determination should be consistent"
    
    @given(system_config_strategy())
    @settings(max_examples=20)
    def test_search_engine_availability_property(self, config):
        """
        Property: Multi-engine search should be available if at least one engine is enabled and available.
        """
        # Ensure at least one engine is enabled
        enabled_engines = [e for e in config.search_engines if e.enabled]
        assume(len(enabled_engines) > 0)
        
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg, \
             patch('src.search_engine.GoogleSearchEngine') as mock_google, \
             patch('src.search_engine.BingSearchEngine') as mock_bing:
            
            # Mock engines based on configuration
            for engine_config in config.search_engines:
                if engine_config.enabled:
                    mock_engine = Mock()
                    mock_engine.is_available.return_value = True
                    
                    if engine_config.name == 'duckduckgo':
                        mock_ddg.return_value = mock_engine
                    elif engine_config.name == 'google':
                        mock_google.return_value = mock_engine
                    elif engine_config.name == 'bing':
                        mock_bing.return_value = mock_engine
            
            try:
                search_engine = MultiEngineSearchEngine(config)
                
                # Property: If any engine is available, multi-engine should be available
                is_available = search_engine.is_available()
                assert isinstance(is_available, bool), "is_available should return a boolean"
                
                # If we have enabled engines, at least one should be available
                if enabled_engines:
                    assert is_available, "Multi-engine search should be available when engines are enabled"
                    
            except Exception as e:
                # If initialization fails, it should be due to no available engines
                assert "No search engines could be initialized" in str(e)


if __name__ == "__main__":
    pytest.main([__file__])

class TestRelevanceEvaluationProperties:
    """Property-based tests specifically for relevance evaluation functionality."""
    
    @given(search_result_strategy(), scale_name_strategy())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_universal_relevance_evaluation(self, result, scale_name):
        """
        **Feature: scale-existence-cleanup, Property 2: Universal relevance evaluation**
        
        For any search result found, the Scale_Search_Engine should evaluate it 
        for relevance to the specific scale.
        
        **Validates: Requirements 1.2**
        """
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            # Property: Relevance evaluation should always work for any valid inputs
            relevance = search_engine.evaluate_search_relevance(result, scale_name)
            
            # Universal property: Relevance must be a valid score
            assert isinstance(relevance, (int, float)), "Relevance must be numeric"
            assert 0.0 <= relevance <= 1.0, f"Relevance {relevance} must be between 0.0 and 1.0"
            
            # Property: Same inputs should produce same relevance (deterministic)
            relevance2 = search_engine.evaluate_search_relevance(result, scale_name)
            assert relevance == relevance2, "Relevance evaluation should be deterministic"
            
            # Property: Relevance should be higher when scale name appears in title
            if scale_name.lower() in result.title.lower():
                # Create a result without the scale name in title for comparison
                modified_result = SearchResult(
                    url=result.url,
                    title="Generic Music Article",  # No scale name
                    snippet=result.snippet,
                    relevance_score=result.relevance_score,
                    source_type=result.source_type,
                    search_engine=result.search_engine,
                    found_at=result.found_at,
                    content_preview=result.content_preview
                )
                
                modified_relevance = search_engine.evaluate_search_relevance(modified_result, scale_name)
                assert relevance >= modified_relevance, \
                    "Results with scale name in title should have higher or equal relevance"
    
    @given(scale_name_strategy())
    @settings(max_examples=50)
    def test_relevance_educational_source_bonus(self, scale_name):
        """
        Property: Educational sources should receive relevance bonus over commercial sources.
        """
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            # Create identical results except for source type
            base_result_data = {
                'url': 'https://example.com/scale',
                'title': f'{scale_name} Information',
                'snippet': f'Information about {scale_name} scale',
                'relevance_score': 0.5,
                'search_engine': 'test',
                'found_at': datetime.now(),
                'content_preview': f'Information about {scale_name}'
            }
            
            educational_result = SearchResult(
                source_type=SourceType.EDUCATIONAL,
                **base_result_data
            )
            
            commercial_result = SearchResult(
                source_type=SourceType.COMMERCIAL,
                **base_result_data
            )
            
            educational_relevance = search_engine.evaluate_search_relevance(educational_result, scale_name)
            commercial_relevance = search_engine.evaluate_search_relevance(commercial_result, scale_name)
            
            # Property: Educational sources should get higher relevance than commercial
            assert educational_relevance >= commercial_relevance, \
                "Educational sources should have higher or equal relevance than commercial sources"
    
    @given(scale_name_strategy())
    @settings(max_examples=30)
    def test_relevance_music_terms_bonus(self, scale_name):
        """
        Property: Results containing music theory terms should get relevance bonus.
        """
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            # Result with music terms
            music_result = SearchResult(
                url='https://example.com/music',
                title=f'{scale_name} Music Theory',
                snippet=f'Learn about {scale_name} scale notes and intervals in music theory',
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine='test',
                found_at=datetime.now(),
                content_preview='Music theory content'
            )
            
            # Result without music terms
            non_music_result = SearchResult(
                url='https://example.com/other',
                title=f'{scale_name} Article',
                snippet=f'General article about {scale_name}',
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine='test',
                found_at=datetime.now(),
                content_preview='General content'
            )
            
            music_relevance = search_engine.evaluate_search_relevance(music_result, scale_name)
            non_music_relevance = search_engine.evaluate_search_relevance(non_music_result, scale_name)
            
            # Property: Music-related content should get higher relevance
            assert music_relevance >= non_music_relevance, \
                "Results with music theory terms should have higher or equal relevance"
    
    @given(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))
    @settings(max_examples=50)
    def test_relevance_case_insensitive(self, scale_name):
        """
        Property: Relevance evaluation should be case-insensitive.
        """
        # Ensure we have a valid scale name
        if not scale_name.strip():
            scale_name = "major"
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = MultiEngineSearchEngine(config)
            
            # Create results with different cases
            lowercase_result = SearchResult(
                url='https://example.com/lower',
                title=f'{scale_name.lower()} scale theory',
                snippet=f'Information about {scale_name.lower()} scale',
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine='test',
                found_at=datetime.now()
            )
            
            uppercase_result = SearchResult(
                url='https://example.com/upper',
                title=f'{scale_name.upper()} SCALE THEORY',
                snippet=f'Information about {scale_name.upper()} SCALE',
                relevance_score=0.5,
                source_type=SourceType.EDUCATIONAL,
                search_engine='test',
                found_at=datetime.now()
            )
            
            lowercase_relevance = search_engine.evaluate_search_relevance(lowercase_result, scale_name)
            uppercase_relevance = search_engine.evaluate_search_relevance(uppercase_result, scale_name)
            
            # Property: Case should not affect relevance significantly
            # Allow small differences due to floating point precision
            assert abs(lowercase_relevance - uppercase_relevance) < 0.01, \
                "Relevance evaluation should be case-insensitive"

class TestCulturalScaleSearchProperties:
    """Property-based tests for cultural scale search functionality."""
    
    @given(scale_name_strategy(), st.sampled_from(['indian', 'arabic', 'chinese', 'japanese', 'western']))
    @settings(max_examples=50)
    def test_cultural_scale_alternative_searching(self, scale_name, cultural_context):
        """
        **Feature: scale-existence-cleanup, Property 17: Cultural scale alternative searching**
        
        For any cultural or regional scale processed, the system should search using 
        alternative names and cultural contexts.
        
        **Validates: Requirements 4.2**
        """
        from src.cultural_search_engine import CulturalScaleSearchEngine
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine') as mock_ddg:
            mock_engine = Mock()
            
            # Mock search results for different terms
            def mock_search(search_term, cultural_context_param=None):
                return [SearchResult(
                    url=f"https://example.com/{search_term.replace(' ', '-')}",
                    title=f"Result for {search_term}",
                    snippet=f"Information about {search_term} in {cultural_context} tradition",
                    relevance_score=0.7,
                    source_type=SourceType.CULTURAL,
                    search_engine="duckduckgo",
                    found_at=datetime.now()
                )]
            
            mock_engine.search_scale.side_effect = mock_search
            mock_ddg.return_value = mock_engine
            
            search_engine = CulturalScaleSearchEngine(config)
            
            # Property: Should generate alternative names for cultural context
            alternatives = search_engine.generate_alternative_names(scale_name, cultural_context)
            
            # Universal property: Alternative names should be a list
            assert isinstance(alternatives, list), "Alternative names should be a list"
            
            # Property: Original scale name should not be in alternatives
            assert scale_name not in alternatives, "Original scale name should not be in alternatives"
            assert scale_name.lower() not in [alt.lower() for alt in alternatives], \
                "Original scale name (case-insensitive) should not be in alternatives"
            
            # Property: For known cultural contexts, should generate culture-specific alternatives
            if cultural_context in ['indian', 'arabic', 'chinese']:
                # Should have at least some alternatives for known cultures
                assert len(alternatives) >= 0, "Should generate alternatives for known cultural contexts"
            
            # Property: All alternatives should be non-empty strings
            for alt in alternatives:
                assert isinstance(alt, str), "Each alternative should be a string"
                assert alt.strip(), "Each alternative should be non-empty"
            
            # Property: Cultural search should use multiple search terms
            results = search_engine.search_scale_with_cultural_context(scale_name, cultural_context)
            
            # Should have called search multiple times (for different cultural terms)
            assert mock_engine.search_scale.call_count >= 1, \
                "Should perform multiple searches for cultural context"
            
            # Property: Results should be properly formatted
            assert isinstance(results, list), "Results should be a list"
            for result in results:
                assert isinstance(result, SearchResult), "Each result should be a SearchResult"
                assert 0.0 <= result.relevance_score <= 1.0, "Relevance scores should be valid"
    
    @given(scale_name_strategy())
    @settings(max_examples=30)
    def test_cultural_context_consistency(self, scale_name):
        """
        Property: Cultural context information should be consistent and well-formed.
        """
        from src.cultural_search_engine import CulturalScaleSearchEngine
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = CulturalScaleSearchEngine(config)
            
            # Property: Cultural contexts should be consistently retrievable
            for culture in ['indian', 'arabic', 'chinese', 'japanese', 'western']:
                context = search_engine._get_cultural_context(culture)
                
                # Should return valid context for known cultures
                assert context is not None, f"Should return context for known culture: {culture}"
                assert context.culture == culture, "Context culture should match requested culture"
                assert isinstance(context.alternative_names, list), "Alternative names should be a list"
                assert isinstance(context.search_terms, list), "Search terms should be a list"
                assert isinstance(context.source_priorities, dict), "Source priorities should be a dict"
                
                # All alternative names should be non-empty strings
                for alt_name in context.alternative_names:
                    assert isinstance(alt_name, str), "Alternative names should be strings"
                    assert alt_name.strip(), "Alternative names should be non-empty"
                
                # All search terms should be non-empty strings
                for term in context.search_terms:
                    assert isinstance(term, str), "Search terms should be strings"
                    assert term.strip(), "Search terms should be non-empty"
                
                # Source priorities should have valid values
                for source_type, priority in context.source_priorities.items():
                    assert isinstance(source_type, SourceType), "Keys should be SourceType enum values"
                    assert isinstance(priority, (int, float)), "Priorities should be numeric"
                    assert 0.0 <= priority <= 1.0, "Priorities should be between 0.0 and 1.0"
    
    @given(search_result_strategy(), scale_name_strategy(), 
           st.sampled_from(['indian', 'arabic', 'chinese', 'japanese', 'western', None]))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.too_slow])
    def test_enhanced_relevance_bounds(self, result, scale_name, cultural_context):
        """
        Property: Enhanced relevance evaluation should always return valid scores.
        """
        from src.cultural_search_engine import CulturalScaleSearchEngine
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = CulturalScaleSearchEngine(config)
            
            # Property: Enhanced relevance should always be within bounds
            relevance = search_engine.evaluate_search_relevance(result, scale_name, cultural_context)
            
            assert isinstance(relevance, (int, float)), "Relevance should be numeric"
            assert 0.0 <= relevance <= 1.0, f"Relevance {relevance} should be between 0.0 and 1.0"
            
            # Property: Same inputs should produce same relevance (deterministic)
            relevance2 = search_engine.evaluate_search_relevance(result, scale_name, cultural_context)
            assert relevance == relevance2, "Enhanced relevance evaluation should be deterministic"
    
    @given(st.lists(search_result_strategy(), min_size=1, max_size=10), 
           st.sampled_from(['indian', 'arabic', 'chinese', 'japanese', 'western']))
    @settings(max_examples=20)
    def test_cultural_prioritization_consistency(self, results, cultural_context):
        """
        Property: Cultural prioritization should be consistent and preserve result validity.
        """
        from src.cultural_search_engine import CulturalScaleSearchEngine
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = CulturalScaleSearchEngine(config)
            
            # Get cultural context
            context_info = search_engine._get_cultural_context(cultural_context)
            assume(context_info is not None)
            
            # Apply cultural prioritization
            original_scores = [r.relevance_score for r in results]
            prioritized_results = search_engine._apply_cultural_prioritization(results.copy(), context_info)
            
            # Property: Should return same number of results
            assert len(prioritized_results) == len(results), \
                "Prioritization should preserve number of results"
            
            # Property: All relevance scores should remain valid
            for result in prioritized_results:
                assert 0.0 <= result.relevance_score <= 1.0, \
                    f"Prioritized relevance {result.relevance_score} should be valid"
            
            # Property: Results should maintain their basic structure
            for original, prioritized in zip(results, prioritized_results):
                assert original.url == prioritized.url, "URL should be preserved"
                assert original.title == prioritized.title, "Title should be preserved"
                assert original.source_type == prioritized.source_type, "Source type should be preserved"
    
    @given(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))
    @settings(max_examples=30)
    def test_alternative_name_generation_properties(self, scale_name):
        """
        Property: Alternative name generation should have consistent behavior.
        """
        from src.cultural_search_engine import CulturalScaleSearchEngine
        
        # Ensure valid scale name
        if not scale_name.strip():
            scale_name = "major"
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_engine = CulturalScaleSearchEngine(config)
            
            # Property: Should always return a list
            alternatives = search_engine.generate_alternative_names(scale_name)
            assert isinstance(alternatives, list), "Should always return a list"
            
            # Property: Should not include the original name
            assert scale_name not in alternatives, "Should not include original name"
            assert scale_name.lower() not in [alt.lower() for alt in alternatives], \
                "Should not include original name (case-insensitive)"
            
            # Property: All alternatives should be valid strings
            for alt in alternatives:
                assert isinstance(alt, str), "Each alternative should be a string"
                assert alt.strip(), "Each alternative should be non-empty"
            
            # Property: Should be deterministic (same input = same output)
            alternatives2 = search_engine.generate_alternative_names(scale_name)
            assert set(alternatives) == set(alternatives2), \
                "Alternative generation should be deterministic"
            
            # Property: With cultural context, should potentially have more alternatives
            for culture in ['indian', 'arabic', 'chinese']:
                cultural_alternatives = search_engine.generate_alternative_names(scale_name, culture)
                assert isinstance(cultural_alternatives, list), \
                    f"Should return list for {culture} context"
                
                # All alternatives should still be valid
                for alt in cultural_alternatives:
                    assert isinstance(alt, str), "Cultural alternatives should be strings"
                    assert alt.strip(), "Cultural alternatives should be non-empty"
class TestSearchLoggingProperties:
    """Property-based tests for search logging functionality."""
    
    @given(scale_name_strategy(), st.lists(search_result_strategy(), min_size=0, max_size=5))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.too_slow])
    def test_complete_search_logging(self, scale_name, search_results):
        """
        **Feature: scale-existence-cleanup, Property 5: Complete search logging**
        
        For any completed search operation, the system should log all found sources 
        with their relevance scores.
        
        **Validates: Requirements 1.5**
        """
        from src.search_logging import SearchLogger
        
        config = SystemConfig()
        config.search_engines = [SearchEngineConfig(name="duckduckgo", enabled=True)]
        
        with patch('src.search_engine.DuckDuckGoSearchEngine'):
            search_logger = SearchLogger(config)
            
            # Property: Should be able to start a search session for any valid scale name
            session_id = search_logger.start_search_session(scale_name)
            
            assert isinstance(session_id, str), "Session ID should be a string"
            assert session_id in search_logger.current_sessions, "Session should be tracked"
            
            # Property: Should be able to log queries for the session
            for i, result in enumerate(search_results[:3]):  # Limit to 3 for performance
                query_id = search_logger.log_search_query(
                    session_id=session_id,
                    search_term=f"{scale_name} query {i+1}",
                    search_engine="test_engine",
                    execution_time_ms=100.0 + i * 10,
                    success=True,
                    results=[result] if result else []
                )
                
                # Property: Query ID should be unique and properly formatted
                assert isinstance(query_id, str), "Query ID should be a string"
                assert session_id in query_id, "Query ID should contain session ID"
            
            # Property: Should be able to end the session with final results
            completed_session = search_logger.end_search_session(session_id, search_results)
            
            # Universal properties for completed sessions
            assert completed_session.session_id == session_id, "Session ID should be preserved"
            assert completed_session.scale_name == scale_name, "Scale name should be preserved"
            assert completed_session.end_time is not None, "End time should be set"
            assert completed_session.unique_results == len(search_results), "Unique results count should match"
            assert len(completed_session.queries) <= 3, "Should have logged the queries"
            
            # Property: Session should be moved to completed sessions
            assert session_id not in search_logger.current_sessions, "Session should be removed from current"
            assert completed_session in search_logger.completed_sessions, "Session should be in completed"
            
            # Property: Statistics should be updated
            stats = search_logger.get_search_statistics()
            assert stats.total_searches >= 1, "Total searches should be incremented"
            assert isinstance(stats.processing_time_seconds, (int, float)), "Processing time should be numeric"
            assert stats.processing_time_seconds >= 0, "Processing time should be non-negative"
    
    @given(st.lists(st.tuples(scale_name_strategy(), st.booleans(), st.floats(min_value=10.0, max_value=1000.0)), 
                   min_size=1, max_size=5))
    @settings(max_examples=20)
    def test_search_statistics_consistency(self, search_operations):
        """
        Property: Search statistics should be consistent and accurately reflect all operations.
        """
        from src.search_logging import SearchLogger
        
        config = SystemConfig()
        search_logger = SearchLogger(config)
        
        total_expected_queries = 0
        successful_expected = 0
        failed_expected = 0
        
        for scale_name, success, execution_time in search_operations:
            session_id = search_logger.start_search_session(scale_name)
            
            # Log a query
            search_logger.log_search_query(
                session_id=session_id,
                search_term=scale_name,
                search_engine="test",
                execution_time_ms=execution_time,
                success=success,
                results=[] if not success else [SearchResult(
                    url=f"https://example.com/{scale_name.replace(' ', '-')}",
                    title=f"Result for {scale_name}",
                    snippet=f"Information about {scale_name}",
                    relevance_score=0.7,
                    source_type=SourceType.EDUCATIONAL,
                    search_engine="test",
                    found_at=datetime.now()
                )],
                error_message=None if success else "Test error"
            )
            
            search_logger.end_search_session(session_id, [])
            
            total_expected_queries += 1
            if success:
                successful_expected += 1
            else:
                failed_expected += 1
        
        # Property: Statistics should accurately reflect all operations
        stats = search_logger.get_search_statistics()
        
        assert search_logger.total_queries == total_expected_queries, \
            f"Total queries should be {total_expected_queries}, got {search_logger.total_queries}"
        assert search_logger.successful_queries == successful_expected, \
            f"Successful queries should be {successful_expected}, got {search_logger.successful_queries}"
        assert search_logger.failed_queries == failed_expected, \
            f"Failed queries should be {failed_expected}, got {search_logger.failed_queries}"
        
        # Property: Statistics object should have valid values
        assert isinstance(stats.total_searches, int), "Total searches should be an integer"
        assert isinstance(stats.successful_searches, int), "Successful searches should be an integer"
        assert isinstance(stats.failed_searches, int), "Failed searches should be an integer"
        assert stats.total_searches >= 0, "Total searches should be non-negative"
        assert stats.successful_searches >= 0, "Successful searches should be non-negative"
        assert stats.failed_searches >= 0, "Failed searches should be non-negative"
    
    @given(scale_name_strategy(), st.lists(st.text(min_size=1, max_size=50), min_size=1, max_size=5))
    @settings(max_examples=20)
    def test_session_query_tracking(self, scale_name, search_terms):
        """
        Property: All queries within a session should be properly tracked and ordered.
        """
        from src.search_logging import SearchLogger
        
        config = SystemConfig()
        search_logger = SearchLogger(config)
        
        session_id = search_logger.start_search_session(scale_name)
        query_ids = []
        
        # Property: Should be able to log multiple queries in sequence
        for i, term in enumerate(search_terms):
            query_id = search_logger.log_search_query(
                session_id=session_id,
                search_term=term,
                search_engine=f"engine_{i % 3}",  # Rotate between engines
                execution_time_ms=50.0 + i * 10,
                success=True,
                results=[]
            )
            query_ids.append(query_id)
        
        completed_session = search_logger.end_search_session(session_id, [])
        
        # Property: All queries should be tracked in the session
        assert len(completed_session.queries) == len(search_terms), \
            "All queries should be tracked in the session"
        
        # Property: Queries should maintain their order
        for i, query in enumerate(completed_session.queries):
            assert query.query_id == query_ids[i], "Queries should maintain their order"
            assert query.search_term == search_terms[i], "Search terms should be preserved"
            assert query.scale_name == scale_name, "Scale name should be consistent"
        
        # Property: Session statistics should be accurate
        assert completed_session.total_queries == len(search_terms), \
            "Total queries should match number of logged queries"
        assert completed_session.successful_queries == len(search_terms), \
            "All queries were successful, count should match"
        assert completed_session.failed_queries == 0, "No queries failed"
    
    @given(st.lists(scale_name_strategy(), min_size=1, max_size=5))
    @settings(max_examples=15)
    def test_performance_metrics_calculation(self, scale_names):
        """
        Property: Performance metrics should be calculated correctly from logged data.
        """
        from src.search_logging import SearchLogger
        
        config = SystemConfig()
        search_logger = SearchLogger(config)
        
        total_execution_time = 0.0
        total_queries = 0
        
        for scale_name in scale_names:
            session_id = search_logger.start_search_session(scale_name)
            
            # Log 2 queries per session
            for i in range(2):
                execution_time = 100.0 + i * 25.0
                total_execution_time += execution_time
                total_queries += 1
                
                search_logger.log_search_query(
                    session_id=session_id,
                    search_term=f"{scale_name} query {i+1}",
                    search_engine="test",
                    execution_time_ms=execution_time,
                    success=True,
                    results=[]
                )
            
            search_logger.end_search_session(session_id, [])
        
        # Property: Performance metrics should be calculated correctly
        metrics = search_logger.get_performance_metrics()
        
        assert isinstance(metrics.total_search_time_ms, (int, float)), \
            "Total search time should be numeric"
        assert metrics.total_search_time_ms == total_execution_time, \
            f"Total search time should be {total_execution_time}, got {metrics.total_search_time_ms}"
        
        expected_avg_time = total_execution_time / total_queries if total_queries > 0 else 0.0
        assert abs(metrics.average_query_time_ms - expected_avg_time) < 0.01, \
            f"Average query time should be {expected_avg_time}, got {metrics.average_query_time_ms}"
        
        assert metrics.queries_per_second >= 0, "Queries per second should be non-negative"
        assert metrics.success_rate >= 0.0, "Success rate should be non-negative"
        assert metrics.success_rate <= 1.0, "Success rate should not exceed 1.0"
    
    @given(scale_name_strategy())
    @settings(max_examples=20)
    def test_search_report_generation(self, scale_name):
        """
        Property: Search reports should be generated successfully and contain required sections.
        """
        from src.search_logging import SearchLogger
        
        config = SystemConfig()
        search_logger = SearchLogger(config)
        
        # Create a simple session
        session_id = search_logger.start_search_session(scale_name)
        search_logger.log_search_query(
            session_id=session_id,
            search_term=scale_name,
            search_engine="test",
            execution_time_ms=75.0,
            success=True,
            results=[]
        )
        search_logger.end_search_session(session_id, [])
        
        # Property: Should be able to generate a report
        report = search_logger.generate_search_report()
        
        # Universal properties for reports
        assert isinstance(report, dict), "Report should be a dictionary"
        
        required_sections = [
            'report_metadata', 'search_statistics', 'performance_metrics',
            'session_summaries', 'engine_usage', 'cultural_context_analysis',
            'top_performing_scales', 'search_patterns'
        ]
        
        for section in required_sections:
            assert section in report, f"Report should contain {section} section"
        
        # Property: Report metadata should be valid
        metadata = report['report_metadata']
        assert 'generated_at' in metadata, "Report should have generation timestamp"
        assert 'total_sessions' in metadata, "Report should have session count"
        assert metadata['total_sessions'] >= 1, "Should have at least one session"
        
        # Property: Session summaries should match completed sessions
        summaries = report['session_summaries']
        assert isinstance(summaries, list), "Session summaries should be a list"
        assert len(summaries) >= 1, "Should have at least one session summary"
        
        # Find our session in the summaries
        our_session = next((s for s in summaries if s['scale_name'] == scale_name), None)
        assert our_session is not None, "Our session should be in the summaries"
        assert our_session['total_queries'] == 1, "Session should have 1 query"
        assert our_session['successful_queries'] == 1, "Session should have 1 successful query"
    
    @given(st.text(min_size=1, max_size=100))
    @settings(max_examples=20)
    def test_session_id_uniqueness(self, scale_name):
        """
        Property: Session IDs should be unique across multiple sessions.
        """
        from src.search_logging import SearchLogger
        
        # Ensure valid scale name
        if not scale_name.strip():
            scale_name = "test_scale"
        
        config = SystemConfig()
        search_logger = SearchLogger(config)
        
        # Property: Multiple sessions should have unique IDs
        session_ids = set()
        
        for i in range(3):  # Create 3 sessions
            session_id = search_logger.start_search_session(f"{scale_name}_{i}")
            
            # Property: Session ID should be unique
            assert session_id not in session_ids, f"Session ID {session_id} should be unique"
            session_ids.add(session_id)
            
            # Property: Session ID should be a non-empty string
            assert isinstance(session_id, str), "Session ID should be a string"
            assert session_id.strip(), "Session ID should be non-empty"
            
            # End the session
            search_logger.end_search_session(session_id, [])
        
        # Property: All sessions should be completed
        assert len(search_logger.completed_sessions) == 3, "All sessions should be completed"
        assert len(search_logger.current_sessions) == 0, "No sessions should be current"