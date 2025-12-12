"""
Scale Search Engine implementation for the Scale Existence Cleanup System.

This module provides concrete implementations of search engines that can search
for musical scale information across multiple search engines including Google,
Bing, and DuckDuckGo.
"""

import os
import requests
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup
import re

try:
    # Try relative imports first (when used as module)
    from .interfaces import SearchEngineInterface, SearchEngineError
    from .models import SearchResult, SearchStatistics, SourceType
    from .config import SystemConfig, SearchEngineConfig
    from .base_implementations import BaseSearchEngine
    from .search_logging import SearchLogger
except ImportError:
    # Fall back to absolute imports (when run as script)
    from interfaces import SearchEngineInterface, SearchEngineError
    from models import SearchResult, SearchStatistics, SourceType
    from config import SystemConfig, SearchEngineConfig
    from base_implementations import BaseSearchEngine
    from search_logging import SearchLogger


class MultiEngineSearchEngine(SearchEngineInterface):
    """
    Multi-engine search implementation that coordinates searches across
    multiple search engines and aggregates results.
    """
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the multi-engine search system.
        
        Args:
            config: System configuration containing search engine settings
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.MultiEngineSearchEngine")
        
        # Initialize search logger
        self.search_logger = SearchLogger(config)
        
        # Initialize individual search engines
        self.engines = {}
        for engine_config in config.search_engines:
            if engine_config.enabled:
                try:
                    if engine_config.name == "google":
                        self.engines["google"] = GoogleSearchEngine(config, engine_config)
                    elif engine_config.name == "bing":
                        self.engines["bing"] = BingSearchEngine(config, engine_config)
                    elif engine_config.name == "duckduckgo":
                        self.engines["duckduckgo"] = DuckDuckGoSearchEngine(config, engine_config)
                    else:
                        self.logger.warning(f"Unknown search engine: {engine_config.name}")
                except Exception as e:
                    self.logger.error(f"Failed to initialize {engine_config.name}: {e}")
        
        if not self.engines:
            raise SearchEngineError("No search engines could be initialized")
        
        self.logger.info(f"Initialized {len(self.engines)} search engines: {list(self.engines.keys())}")
        
        # Statistics tracking
        self.total_searches = 0
        self.successful_searches = 0
        self.failed_searches = 0
        self.start_time = time.time()
    
    def search_scale(self, scale_name: str, cultural_context: str = None) -> List[SearchResult]:
        """
        Search for scale information across all available search engines.
        
        Args:
            scale_name: Name of the scale to search for
            cultural_context: Optional cultural context for the scale
            
        Returns:
            Aggregated list of search results from all engines
        """
        if not scale_name.strip():
            raise SearchEngineError("Scale name cannot be empty")
        
        # Start search session for logging
        session_id = self.search_logger.start_search_session(scale_name, cultural_context)
        
        self.total_searches += 1
        all_results = []
        successful_engines = 0
        
        for engine_name, engine in self.engines.items():
            start_time = time.time()
            try:
                self.logger.debug(f"Searching with {engine_name} for scale: {scale_name}")
                results = engine.search_scale(scale_name, cultural_context)
                execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                
                # Log successful query
                self.search_logger.log_search_query(
                    session_id=session_id,
                    search_term=scale_name,
                    search_engine=engine_name,
                    execution_time_ms=execution_time,
                    success=True,
                    results=results
                )
                
                all_results.extend(results)
                successful_engines += 1
                self.logger.debug(f"{engine_name} returned {len(results)} results")
            except Exception as e:
                execution_time = (time.time() - start_time) * 1000
                
                # Log failed query
                self.search_logger.log_search_query(
                    session_id=session_id,
                    search_term=scale_name,
                    search_engine=engine_name,
                    execution_time_ms=execution_time,
                    success=False,
                    error_message=str(e)
                )
                
                self.logger.warning(f"Search failed with {engine_name}: {e}")
        
        if successful_engines > 0:
            self.successful_searches += 1
        else:
            self.failed_searches += 1
            # End session with no results
            self.search_logger.end_search_session(session_id, [])
            raise SearchEngineError(f"All search engines failed for scale: {scale_name}")
        
        # Remove duplicates and sort by relevance
        unique_results = self._deduplicate_results(all_results)
        sorted_results = sorted(unique_results, key=lambda x: x.relevance_score, reverse=True)
        
        # End search session with final results
        self.search_logger.end_search_session(session_id, sorted_results)
        
        self.logger.info(f"Found {len(sorted_results)} unique results for '{scale_name}' from {successful_engines} engines")
        return sorted_results
    
    def search_with_alternatives(self, scale_name: str, alternatives: List[str]) -> List[SearchResult]:
        """
        Search using alternative names for a scale across all engines.
        
        Args:
            scale_name: Primary name of the scale
            alternatives: List of alternative names
            
        Returns:
            Aggregated results from all name variations
        """
        all_results = []
        
        # Search with primary name
        try:
            primary_results = self.search_scale(scale_name)
            all_results.extend(primary_results)
        except SearchEngineError as e:
            self.logger.warning(f"Primary search failed for '{scale_name}': {e}")
        
        # Search with alternatives
        for alt_name in alternatives:
            try:
                alt_results = self.search_scale(alt_name)
                all_results.extend(alt_results)
            except SearchEngineError as e:
                self.logger.warning(f"Alternative search failed for '{alt_name}': {e}")
        
        # Deduplicate and sort
        unique_results = self._deduplicate_results(all_results)
        sorted_results = sorted(unique_results, key=lambda x: x.relevance_score, reverse=True)
        
        return sorted_results
    
    def evaluate_search_relevance(self, result: SearchResult, scale_name: str) -> float:
        """
        Evaluate how relevant a search result is to the scale.
        
        Args:
            result: Search result to evaluate
            scale_name: Name of the scale being searched
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        relevance = 0.0
        scale_name_lower = scale_name.lower()
        
        # Title relevance (40% weight)
        if scale_name_lower in result.title.lower():
            relevance += 0.4
        elif any(word in result.title.lower() for word in scale_name_lower.split()):
            relevance += 0.2
        
        # Snippet relevance (30% weight)
        if scale_name_lower in result.snippet.lower():
            relevance += 0.3
        elif any(word in result.snippet.lower() for word in scale_name_lower.split()):
            relevance += 0.15
        
        # Music theory terms (20% weight)
        music_terms = ['scale', 'music', 'theory', 'notes', 'intervals', 'chord', 'harmony', 'melody']
        content = (result.title + " " + result.snippet).lower()
        music_term_count = sum(1 for term in music_terms if term in content)
        relevance += min(music_term_count * 0.05, 0.2)
        
        # Source type bonus (10% weight)
        source_bonuses = {
            SourceType.ACADEMIC: 0.1,
            SourceType.EDUCATIONAL: 0.08,
            SourceType.CULTURAL: 0.06,
            SourceType.COMMERCIAL: 0.02
        }
        relevance += source_bonuses.get(result.source_type, 0.0)
        
        return min(relevance, 1.0)
    
    def get_search_statistics(self) -> SearchStatistics:
        """Get aggregated search statistics from all engines."""
        processing_time = time.time() - self.start_time
        
        # Aggregate statistics from individual engines
        total_results = 0
        all_engines = []
        total_relevance = 0.0
        result_count = 0
        
        for engine_name, engine in self.engines.items():
            try:
                engine_stats = engine.get_search_statistics()
                total_results += engine_stats.total_results_found
                all_engines.extend(engine_stats.search_engines_used)
                if engine_stats.total_results_found > 0:
                    total_relevance += engine_stats.average_relevance_score * engine_stats.total_results_found
                    result_count += engine_stats.total_results_found
            except Exception as e:
                self.logger.warning(f"Failed to get statistics from {engine_name}: {e}")
        
        avg_relevance = total_relevance / result_count if result_count > 0 else 0.0
        
        return SearchStatistics(
            total_searches=self.total_searches,
            successful_searches=self.successful_searches,
            failed_searches=self.failed_searches,
            total_results_found=total_results,
            average_relevance_score=avg_relevance,
            search_engines_used=list(set(all_engines)),
            processing_time_seconds=processing_time
        )
    
    def is_available(self) -> bool:
        """Check if at least one search engine is available."""
        return any(engine.is_available() for engine in self.engines.values())
    
    def get_search_logger(self) -> SearchLogger:
        """Get the search logger instance for external access."""
        return self.search_logger
    
    def generate_search_report(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive search report.
        
        Args:
            output_path: Optional path to save the report
            
        Returns:
            Dictionary containing the complete search report
        """
        return self.search_logger.generate_search_report(output_path)
    
    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Remove duplicate results based on URL, keeping the one with highest relevance."""
        unique_results = {}
        
        for result in results:
            url = result.url.lower().rstrip('/')
            if url not in unique_results or result.relevance_score > unique_results[url].relevance_score:
                unique_results[url] = result
        
        return list(unique_results.values())


class GoogleSearchEngine(BaseSearchEngine):
    """Google Custom Search API implementation."""
    
    def __init__(self, config: SystemConfig, engine_config: SearchEngineConfig):
        """Initialize Google search engine."""
        super().__init__(config, "google")
        # Override the engine_config found by the base class with the one passed in
        self.engine_config = engine_config
        self.api_key = engine_config.api_key
        self.search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID", "")
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
        if not self.api_key:
            self.logger.warning("Google API key not provided")
        if not self.search_engine_id:
            self.logger.warning("Google Search Engine ID not provided")
    
    def _perform_search(self, search_term: str) -> List[SearchResult]:
        """Perform Google Custom Search."""
        if not self.api_key or not self.search_engine_id:
            raise SearchEngineError("Google API key or Search Engine ID not configured")
        
        params = {
            'key': self.api_key,
            'cx': self.search_engine_id,
            'q': search_term,
            'num': min(self.engine_config.max_results_per_query, 10)
        }
        
        try:
            response = requests.get(
                self.base_url,
                params=params,
                timeout=self.engine_config.timeout_seconds
            )
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('items', []):
                source_type = self._determine_source_type(item['link'])
                
                result = SearchResult(
                    url=item['link'],
                    title=item['title'],
                    snippet=item.get('snippet', ''),
                    relevance_score=0.0,  # Will be calculated later
                    source_type=source_type,
                    search_engine="google",
                    found_at=datetime.now(),
                    content_preview=item.get('snippet', '')[:200]
                )
                results.append(result)
            
            return results
            
        except requests.RequestException as e:
            raise SearchEngineError(f"Google search request failed: {e}")
        except KeyError as e:
            raise SearchEngineError(f"Unexpected Google API response format: {e}")
    
    def is_available(self) -> bool:
        """Check if Google search is properly configured."""
        return self.engine_config.enabled and bool(self.api_key and self.search_engine_id)


class BingSearchEngine(BaseSearchEngine):
    """Bing Search API implementation."""
    
    def __init__(self, config: SystemConfig, engine_config: SearchEngineConfig):
        """Initialize Bing search engine."""
        super().__init__(config, "bing")
        # Override the engine_config found by the base class with the one passed in
        self.engine_config = engine_config
        self.api_key = engine_config.api_key
        self.base_url = "https://api.bing.microsoft.com/v7.0/search"
        
        if not self.api_key:
            self.logger.warning("Bing API key not provided")
    
    def _perform_search(self, search_term: str) -> List[SearchResult]:
        """Perform Bing Web Search."""
        if not self.api_key:
            raise SearchEngineError("Bing API key not configured")
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.api_key
        }
        
        params = {
            'q': search_term,
            'count': min(self.engine_config.max_results_per_query, 50),
            'responseFilter': 'Webpages'
        }
        
        try:
            response = requests.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=self.engine_config.timeout_seconds
            )
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('webPages', {}).get('value', []):
                source_type = self._determine_source_type(item['url'])
                
                result = SearchResult(
                    url=item['url'],
                    title=item['name'],
                    snippet=item.get('snippet', ''),
                    relevance_score=0.0,  # Will be calculated later
                    source_type=source_type,
                    search_engine="bing",
                    found_at=datetime.now(),
                    content_preview=item.get('snippet', '')[:200]
                )
                results.append(result)
            
            return results
            
        except requests.RequestException as e:
            raise SearchEngineError(f"Bing search request failed: {e}")
        except KeyError as e:
            raise SearchEngineError(f"Unexpected Bing API response format: {e}")
    
    def is_available(self) -> bool:
        """Check if Bing search is properly configured."""
        return self.engine_config.enabled and bool(self.api_key)


class DuckDuckGoSearchEngine(BaseSearchEngine):
    """DuckDuckGo search implementation using web scraping."""
    
    def __init__(self, config: SystemConfig, engine_config: SearchEngineConfig):
        """Initialize DuckDuckGo search engine."""
        super().__init__(config, "duckduckgo")
        # Override the engine_config found by the base class with the one passed in
        self.engine_config = engine_config
        self.base_url = "https://duckduckgo.com/html/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': config.fair_use.user_agent
        })
    
    def _perform_search(self, search_term: str) -> List[SearchResult]:
        """Perform DuckDuckGo search via web scraping."""
        params = {
            'q': search_term,
            'kl': 'us-en'
        }
        
        try:
            # Add delay to respect rate limits
            time.sleep(1.0)
            
            response = self.session.get(
                self.base_url,
                params=params,
                timeout=self.engine_config.timeout_seconds
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            # Parse DuckDuckGo results
            result_elements = soup.find_all('div', class_='result')
            
            for element in result_elements[:self.engine_config.max_results_per_query]:
                try:
                    title_elem = element.find('a', class_='result__a')
                    snippet_elem = element.find('a', class_='result__snippet')
                    
                    if title_elem and title_elem.get('href'):
                        url = title_elem['href']
                        title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                        
                        source_type = self._determine_source_type(url)
                        
                        result = SearchResult(
                            url=url,
                            title=title,
                            snippet=snippet,
                            relevance_score=0.0,  # Will be calculated later
                            source_type=source_type,
                            search_engine="duckduckgo",
                            found_at=datetime.now(),
                            content_preview=snippet[:200]
                        )
                        results.append(result)
                        
                except Exception as e:
                    self.logger.warning(f"Failed to parse DuckDuckGo result: {e}")
                    continue
            
            return results
            
        except requests.RequestException as e:
            raise SearchEngineError(f"DuckDuckGo search request failed: {e}")
        except Exception as e:
            raise SearchEngineError(f"DuckDuckGo search parsing failed: {e}")
    
    def is_available(self) -> bool:
        """DuckDuckGo is available when enabled."""
        return self.engine_config.enabled


def _determine_source_type(url: str) -> SourceType:
    """
    Determine the type of source based on URL patterns.
    
    Args:
        url: URL to analyze
        
    Returns:
        SourceType enum value
    """
    url_lower = url.lower()
    
    # Academic sources (check first to avoid conflicts with .edu)
    if any(domain in url_lower for domain in ['scholar.google', 'jstor', 'researchgate']):
        return SourceType.ACADEMIC
    
    # Special case for academia.edu - it's academic despite .edu domain
    if 'academia.edu' in url_lower:
        return SourceType.ACADEMIC
    
    # Educational institutions
    if any(domain in url_lower for domain in ['.edu', 'university', 'college', 'school']):
        return SourceType.EDUCATIONAL
    
    # Cultural and ethnomusicological sources
    if any(term in url_lower for term in ['ethnomusicology', 'cultural', 'traditional', 'folk']):
        return SourceType.CULTURAL
    
    # Educational organizations and resources
    if any(domain in url_lower for domain in ['.org', 'wikipedia', 'britannica', 'musictheory']):
        return SourceType.EDUCATIONAL
    
    # Commercial music sites
    if any(domain in url_lower for domain in ['.com', 'music', 'guitar', 'piano', 'lesson']):
        return SourceType.COMMERCIAL
    
    return SourceType.UNKNOWN


