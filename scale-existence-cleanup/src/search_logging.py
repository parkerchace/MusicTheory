"""
Search Result Logging and Statistics for Scale Existence Cleanup System.

This module provides comprehensive logging of search queries and results,
statistics collection, and search performance monitoring.
"""

import json
import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path

try:
    # Try relative imports first (when used as module)
    from .models import SearchResult, SearchStatistics, SourceType
    from .config import SystemConfig
except ImportError:
    # Fall back to absolute imports (when run as script)
    from models import SearchResult, SearchStatistics, SourceType
    from config import SystemConfig


@dataclass
class SearchQuery:
    """Represents a search query with metadata."""
    query_id: str
    scale_name: str
    search_term: str
    cultural_context: Optional[str]
    search_engine: str
    timestamp: datetime
    execution_time_ms: float
    success: bool
    error_message: Optional[str] = None
    results_count: int = 0


@dataclass
class SearchSession:
    """Represents a complete search session for a scale."""
    session_id: str
    scale_name: str
    cultural_context: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    total_queries: int
    successful_queries: int
    failed_queries: int
    total_results: int
    unique_results: int
    average_relevance: float
    queries: List[SearchQuery]


@dataclass
class PerformanceMetrics:
    """Performance metrics for search operations."""
    total_search_time_ms: float
    average_query_time_ms: float
    queries_per_second: float
    results_per_query: float
    success_rate: float
    engine_performance: Dict[str, Dict[str, float]]  # engine -> metric -> value


class SearchLogger:
    """
    Comprehensive logging system for search operations.
    
    Provides detailed logging of search queries, results, and performance metrics
    with support for structured logging and statistics collection.
    """
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the search logger.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.SearchLogger")
        
        # Initialize logging directory
        self.log_dir = Path(config.reporting.report_directory) / "search_logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Current session tracking
        self.current_sessions: Dict[str, SearchSession] = {}
        self.completed_sessions: List[SearchSession] = []
        
        # Performance tracking
        self.performance_metrics = PerformanceMetrics(
            total_search_time_ms=0.0,
            average_query_time_ms=0.0,
            queries_per_second=0.0,
            results_per_query=0.0,
            success_rate=0.0,
            engine_performance={}
        )
        
        # Statistics tracking
        self.total_queries = 0
        self.successful_queries = 0
        self.failed_queries = 0
        self.total_results = 0
        self.start_time = time.time()
        
        self.logger.info(f"Search logger initialized with log directory: {self.log_dir}")
    
    def start_search_session(self, scale_name: str, cultural_context: Optional[str] = None) -> str:
        """
        Start a new search session for a scale.
        
        Args:
            scale_name: Name of the scale being searched
            cultural_context: Optional cultural context
            
        Returns:
            Session ID for tracking
        """
        session_id = f"{scale_name}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        session = SearchSession(
            session_id=session_id,
            scale_name=scale_name,
            cultural_context=cultural_context,
            start_time=datetime.now(),
            end_time=None,
            total_queries=0,
            successful_queries=0,
            failed_queries=0,
            total_results=0,
            unique_results=0,
            average_relevance=0.0,
            queries=[]
        )
        
        self.current_sessions[session_id] = session
        
        self.logger.info(f"Started search session {session_id} for scale '{scale_name}' "
                        f"with cultural context: {cultural_context}")
        
        return session_id
    
    def log_search_query(self, session_id: str, search_term: str, search_engine: str,
                        execution_time_ms: float, success: bool, results: List[SearchResult] = None,
                        error_message: Optional[str] = None) -> str:
        """
        Log a search query and its results.
        
        Args:
            session_id: ID of the search session
            search_term: The search term used
            search_engine: Name of the search engine
            execution_time_ms: Query execution time in milliseconds
            success: Whether the query was successful
            results: List of search results (if successful)
            error_message: Error message (if failed)
            
        Returns:
            Query ID for reference
        """
        if session_id not in self.current_sessions:
            raise ValueError(f"Unknown session ID: {session_id}")
        
        session = self.current_sessions[session_id]
        query_id = f"{session_id}_q{len(session.queries) + 1}"
        
        query = SearchQuery(
            query_id=query_id,
            scale_name=session.scale_name,
            search_term=search_term,
            cultural_context=session.cultural_context,
            search_engine=search_engine,
            timestamp=datetime.now(),
            execution_time_ms=execution_time_ms,
            success=success,
            error_message=error_message,
            results_count=len(results) if results else 0
        )
        
        # Update session statistics
        session.queries.append(query)
        session.total_queries += 1
        
        if success:
            session.successful_queries += 1
            if results:
                session.total_results += len(results)
        else:
            session.failed_queries += 1
        
        # Update global statistics
        self.total_queries += 1
        if success:
            self.successful_queries += 1
            if results:
                self.total_results += len(results)
        else:
            self.failed_queries += 1
        
        # Log the query
        self.logger.info(f"Query {query_id}: '{search_term}' on {search_engine} "
                        f"({'SUCCESS' if success else 'FAILED'}) "
                        f"in {execution_time_ms:.2f}ms, {len(results) if results else 0} results")
        
        if not success and error_message:
            self.logger.warning(f"Query {query_id} failed: {error_message}")
        
        # Log detailed results if successful
        if success and results:
            self._log_search_results(query_id, results)
        
        return query_id
    
    def end_search_session(self, session_id: str, final_results: List[SearchResult]) -> SearchSession:
        """
        End a search session and calculate final statistics.
        
        Args:
            session_id: ID of the search session
            final_results: Final deduplicated results
            
        Returns:
            Completed search session
        """
        if session_id not in self.current_sessions:
            raise ValueError(f"Unknown session ID: {session_id}")
        
        session = self.current_sessions[session_id]
        session.end_time = datetime.now()
        session.unique_results = len(final_results)
        
        # Calculate average relevance
        if final_results:
            session.average_relevance = sum(r.relevance_score for r in final_results) / len(final_results)
        
        # Move to completed sessions
        self.completed_sessions.append(session)
        del self.current_sessions[session_id]
        
        # Log session completion
        duration = (session.end_time - session.start_time).total_seconds()
        self.logger.info(f"Completed search session {session_id} for '{session.scale_name}' "
                        f"in {duration:.2f}s: {session.successful_queries}/{session.total_queries} "
                        f"successful queries, {session.unique_results} unique results, "
                        f"avg relevance: {session.average_relevance:.3f}")
        
        # Save session to file
        self._save_session_log(session)
        
        return session
    
    def get_search_statistics(self) -> SearchStatistics:
        """
        Get comprehensive search statistics.
        
        Returns:
            SearchStatistics object with current statistics
        """
        processing_time = time.time() - self.start_time
        
        # Calculate engine usage
        engines_used = set()
        for session in self.completed_sessions:
            for query in session.queries:
                engines_used.add(query.search_engine)
        
        # Calculate average relevance across all sessions
        total_relevance = 0.0
        total_results_with_relevance = 0
        
        for session in self.completed_sessions:
            if session.unique_results > 0:
                total_relevance += session.average_relevance * session.unique_results
                total_results_with_relevance += session.unique_results
        
        avg_relevance = total_relevance / total_results_with_relevance if total_results_with_relevance > 0 else 0.0
        
        return SearchStatistics(
            total_searches=len(self.completed_sessions),
            successful_searches=sum(1 for s in self.completed_sessions if s.successful_queries > 0),
            failed_searches=sum(1 for s in self.completed_sessions if s.successful_queries == 0),
            total_results_found=self.total_results,
            average_relevance_score=avg_relevance,
            search_engines_used=list(engines_used),
            processing_time_seconds=processing_time
        )
    
    def get_performance_metrics(self) -> PerformanceMetrics:
        """
        Get detailed performance metrics.
        
        Returns:
            PerformanceMetrics object with performance data
        """
        if not self.completed_sessions:
            return self.performance_metrics
        
        # Calculate timing metrics
        total_query_time = 0.0
        query_count = 0
        engine_times = {}
        engine_counts = {}
        
        for session in self.completed_sessions:
            for query in session.queries:
                total_query_time += query.execution_time_ms
                query_count += 1
                
                # Track per-engine performance
                engine = query.search_engine
                if engine not in engine_times:
                    engine_times[engine] = 0.0
                    engine_counts[engine] = 0
                
                engine_times[engine] += query.execution_time_ms
                engine_counts[engine] += 1
        
        # Calculate overall metrics
        avg_query_time = total_query_time / query_count if query_count > 0 else 0.0
        processing_time = time.time() - self.start_time
        queries_per_second = query_count / processing_time if processing_time > 0 else 0.0
        results_per_query = self.total_results / query_count if query_count > 0 else 0.0
        success_rate = self.successful_queries / self.total_queries if self.total_queries > 0 else 0.0
        
        # Calculate per-engine metrics
        engine_performance = {}
        for engine in engine_times:
            engine_performance[engine] = {
                'average_time_ms': engine_times[engine] / engine_counts[engine],
                'total_queries': engine_counts[engine],
                'success_rate': 1.0  # Would need to track failures per engine for accurate calculation
            }
        
        self.performance_metrics = PerformanceMetrics(
            total_search_time_ms=total_query_time,
            average_query_time_ms=avg_query_time,
            queries_per_second=queries_per_second,
            results_per_query=results_per_query,
            success_rate=success_rate,
            engine_performance=engine_performance
        )
        
        return self.performance_metrics
    
    def generate_search_report(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive search report.
        
        Args:
            output_path: Optional path to save the report
            
        Returns:
            Dictionary containing the complete search report
        """
        statistics = self.get_search_statistics()
        performance = self.get_performance_metrics()
        
        report = {
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'report_period': {
                    'start': datetime.fromtimestamp(self.start_time).isoformat(),
                    'end': datetime.now().isoformat()
                },
                'total_sessions': len(self.completed_sessions)
            },
            'search_statistics': asdict(statistics),
            'performance_metrics': asdict(performance),
            'session_summaries': [
                {
                    'session_id': session.session_id,
                    'scale_name': session.scale_name,
                    'cultural_context': session.cultural_context,
                    'duration_seconds': (session.end_time - session.start_time).total_seconds(),
                    'total_queries': session.total_queries,
                    'successful_queries': session.successful_queries,
                    'unique_results': session.unique_results,
                    'average_relevance': session.average_relevance
                }
                for session in self.completed_sessions
            ],
            'engine_usage': self._calculate_engine_usage(),
            'cultural_context_analysis': self._analyze_cultural_contexts(),
            'top_performing_scales': self._get_top_performing_scales(),
            'search_patterns': self._analyze_search_patterns()
        }
        
        # Save report if path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, default=str)
            self.logger.info(f"Search report saved to: {output_path}")
        
        return report
    
    def _log_search_results(self, query_id: str, results: List[SearchResult]) -> None:
        """Log detailed search results."""
        for i, result in enumerate(results):
            self.logger.debug(f"Query {query_id} Result {i+1}: "
                            f"'{result.title}' ({result.url}) "
                            f"relevance: {result.relevance_score:.3f}, "
                            f"source: {result.source_type.value}")
    
    def _save_session_log(self, session: SearchSession) -> None:
        """Save session log to file."""
        log_file = self.log_dir / f"session_{session.session_id}.json"
        
        session_data = {
            'session_id': session.session_id,
            'scale_name': session.scale_name,
            'cultural_context': session.cultural_context,
            'start_time': session.start_time.isoformat(),
            'end_time': session.end_time.isoformat() if session.end_time else None,
            'statistics': {
                'total_queries': session.total_queries,
                'successful_queries': session.successful_queries,
                'failed_queries': session.failed_queries,
                'total_results': session.total_results,
                'unique_results': session.unique_results,
                'average_relevance': session.average_relevance
            },
            'queries': [asdict(query) for query in session.queries]
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, default=str)
    
    def _calculate_engine_usage(self) -> Dict[str, Any]:
        """Calculate search engine usage statistics."""
        engine_stats = {}
        
        for session in self.completed_sessions:
            for query in session.queries:
                engine = query.search_engine
                if engine not in engine_stats:
                    engine_stats[engine] = {
                        'total_queries': 0,
                        'successful_queries': 0,
                        'total_results': 0,
                        'total_time_ms': 0.0
                    }
                
                engine_stats[engine]['total_queries'] += 1
                engine_stats[engine]['total_time_ms'] += query.execution_time_ms
                
                if query.success:
                    engine_stats[engine]['successful_queries'] += 1
                    engine_stats[engine]['total_results'] += query.results_count
        
        # Calculate derived metrics
        for engine, stats in engine_stats.items():
            stats['success_rate'] = stats['successful_queries'] / stats['total_queries'] if stats['total_queries'] > 0 else 0.0
            stats['average_time_ms'] = stats['total_time_ms'] / stats['total_queries'] if stats['total_queries'] > 0 else 0.0
            stats['results_per_query'] = stats['total_results'] / stats['successful_queries'] if stats['successful_queries'] > 0 else 0.0
        
        return engine_stats
    
    def _analyze_cultural_contexts(self) -> Dict[str, Any]:
        """Analyze cultural context usage and performance."""
        context_stats = {}
        
        for session in self.completed_sessions:
            context = session.cultural_context or 'none'
            
            if context not in context_stats:
                context_stats[context] = {
                    'sessions': 0,
                    'total_queries': 0,
                    'successful_queries': 0,
                    'total_results': 0,
                    'average_relevance': 0.0
                }
            
            stats = context_stats[context]
            stats['sessions'] += 1
            stats['total_queries'] += session.total_queries
            stats['successful_queries'] += session.successful_queries
            stats['total_results'] += session.unique_results
            stats['average_relevance'] += session.average_relevance
        
        # Calculate averages
        for context, stats in context_stats.items():
            if stats['sessions'] > 0:
                stats['average_relevance'] /= stats['sessions']
                stats['success_rate'] = stats['successful_queries'] / stats['total_queries'] if stats['total_queries'] > 0 else 0.0
                stats['results_per_session'] = stats['total_results'] / stats['sessions']
        
        return context_stats
    
    def _get_top_performing_scales(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top performing scales by various metrics."""
        scale_performance = {}
        
        for session in self.completed_sessions:
            scale = session.scale_name
            
            if scale not in scale_performance:
                scale_performance[scale] = {
                    'scale_name': scale,
                    'sessions': 0,
                    'total_results': 0,
                    'average_relevance': 0.0,
                    'success_rate': 0.0,
                    'total_queries': 0,
                    'successful_queries': 0
                }
            
            perf = scale_performance[scale]
            perf['sessions'] += 1
            perf['total_results'] += session.unique_results
            perf['average_relevance'] += session.average_relevance
            perf['total_queries'] += session.total_queries
            perf['successful_queries'] += session.successful_queries
        
        # Calculate final metrics
        for scale, perf in scale_performance.items():
            if perf['sessions'] > 0:
                perf['average_relevance'] /= perf['sessions']
                perf['results_per_session'] = perf['total_results'] / perf['sessions']
                perf['success_rate'] = perf['successful_queries'] / perf['total_queries'] if perf['total_queries'] > 0 else 0.0
        
        # Sort by average relevance and return top performers
        sorted_scales = sorted(scale_performance.values(), 
                             key=lambda x: x['average_relevance'], 
                             reverse=True)
        
        return sorted_scales[:limit]
    
    def _analyze_search_patterns(self) -> Dict[str, Any]:
        """Analyze search patterns and trends."""
        patterns = {
            'most_common_search_terms': {},
            'peak_search_hours': {},
            'average_session_duration': 0.0,
            'queries_per_session': 0.0
        }
        
        total_duration = 0.0
        total_queries = 0
        
        for session in self.completed_sessions:
            # Track session duration
            if session.end_time:
                duration = (session.end_time - session.start_time).total_seconds()
                total_duration += duration
            
            total_queries += session.total_queries
            
            # Track search hour patterns
            hour = session.start_time.hour
            patterns['peak_search_hours'][hour] = patterns['peak_search_hours'].get(hour, 0) + 1
            
            # Track common search terms
            for query in session.queries:
                term = query.search_term.lower()
                patterns['most_common_search_terms'][term] = patterns['most_common_search_terms'].get(term, 0) + 1
        
        # Calculate averages
        if self.completed_sessions:
            patterns['average_session_duration'] = total_duration / len(self.completed_sessions)
            patterns['queries_per_session'] = total_queries / len(self.completed_sessions)
        
        # Sort and limit common terms
        sorted_terms = sorted(patterns['most_common_search_terms'].items(), 
                            key=lambda x: x[1], reverse=True)
        patterns['most_common_search_terms'] = dict(sorted_terms[:20])
        
        return patterns