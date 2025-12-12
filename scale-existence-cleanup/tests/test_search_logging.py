"""
Tests for the Search Logging and Statistics functionality.
"""

import pytest
import tempfile
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from src.search_logging import SearchLogger, SearchQuery, SearchSession, PerformanceMetrics
from src.models import SearchResult, SourceType, SearchStatistics
from src.config import SystemConfig, ReportingConfig


class TestSearchLogger:
    """Test the search logging functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.config = SystemConfig()
        self.config.reporting = ReportingConfig(report_directory=self.temp_dir)
    
    def test_initialization(self):
        """Test search logger initialization."""
        logger = SearchLogger(self.config)
        
        assert logger is not None
        assert logger.config == self.config
        assert logger.log_dir.exists()
        assert logger.total_queries == 0
        assert logger.successful_queries == 0
        assert logger.failed_queries == 0
    
    def test_start_search_session(self):
        """Test starting a search session."""
        logger = SearchLogger(self.config)
        
        session_id = logger.start_search_session("major scale", "western")
        
        assert session_id is not None
        assert session_id in logger.current_sessions
        
        session = logger.current_sessions[session_id]
        assert session.scale_name == "major scale"
        assert session.cultural_context == "western"
        assert session.total_queries == 0
        assert session.successful_queries == 0
        assert session.failed_queries == 0
    
    def test_log_successful_search_query(self):
        """Test logging a successful search query."""
        logger = SearchLogger(self.config)
        session_id = logger.start_search_session("pentatonic")
        
        # Create mock results
        results = [
            SearchResult(
                url="https://example.com/pentatonic",
                title="Pentatonic Scale",
                snippet="Information about pentatonic scales",
                relevance_score=0.8,
                source_type=SourceType.EDUCATIONAL,
                search_engine="google",
                found_at=datetime.now()
            )
        ]
        
        query_id = logger.log_search_query(
            session_id=session_id,
            search_term="pentatonic scale",
            search_engine="google",
            execution_time_ms=150.5,
            success=True,
            results=results
        )
        
        assert query_id is not None
        assert logger.total_queries == 1
        assert logger.successful_queries == 1
        assert logger.failed_queries == 0
        
        session = logger.current_sessions[session_id]
        assert session.total_queries == 1
        assert session.successful_queries == 1
        assert session.total_results == 1
        assert len(session.queries) == 1
        
        query = session.queries[0]
        assert query.query_id == query_id
        assert query.search_term == "pentatonic scale"
        assert query.search_engine == "google"
        assert query.success == True
        assert query.results_count == 1
    
    def test_log_failed_search_query(self):
        """Test logging a failed search query."""
        logger = SearchLogger(self.config)
        session_id = logger.start_search_session("test scale")
        
        query_id = logger.log_search_query(
            session_id=session_id,
            search_term="test scale",
            search_engine="bing",
            execution_time_ms=75.2,
            success=False,
            error_message="API rate limit exceeded"
        )
        
        assert query_id is not None
        assert logger.total_queries == 1
        assert logger.successful_queries == 0
        assert logger.failed_queries == 1
        
        session = logger.current_sessions[session_id]
        assert session.total_queries == 1
        assert session.failed_queries == 1
        
        query = session.queries[0]
        assert query.success == False
        assert query.error_message == "API rate limit exceeded"
        assert query.results_count == 0
    
    def test_end_search_session(self):
        """Test ending a search session."""
        logger = SearchLogger(self.config)
        session_id = logger.start_search_session("blues scale")
        
        # Add some queries
        mock_result = SearchResult(
            url="https://example.com/blues",
            title="Blues Scale",
            snippet="Blues scale info",
            relevance_score=0.8,
            source_type=SourceType.EDUCATIONAL,
            search_engine="google",
            found_at=datetime.now()
        )
        
        logger.log_search_query(
            session_id=session_id,
            search_term="blues scale",
            search_engine="google",
            execution_time_ms=100.0,
            success=True,
            results=[mock_result]
        )
        
        # Create final results
        final_results = [
            SearchResult(
                url="https://example.com/blues",
                title="Blues Scale",
                snippet="Blues scale information",
                relevance_score=0.9,
                source_type=SourceType.EDUCATIONAL,
                search_engine="google",
                found_at=datetime.now()
            )
        ]
        
        completed_session = logger.end_search_session(session_id, final_results)
        
        assert session_id not in logger.current_sessions
        assert completed_session in logger.completed_sessions
        assert completed_session.end_time is not None
        assert completed_session.unique_results == 1
        assert completed_session.average_relevance == 0.9
    
    def test_get_search_statistics(self):
        """Test getting search statistics."""
        logger = SearchLogger(self.config)
        
        # Create and complete a session
        session_id = logger.start_search_session("major")
        mock_result = SearchResult(
            url="https://example.com/major",
            title="Major Scale",
            snippet="Major scale info",
            relevance_score=0.8,
            source_type=SourceType.EDUCATIONAL,
            search_engine="google",
            found_at=datetime.now()
        )
        
        logger.log_search_query(
            session_id=session_id,
            search_term="major scale",
            search_engine="google",
            execution_time_ms=100.0,
            success=True,
            results=[mock_result]
        )
        
        final_results = [mock_result]
        logger.end_search_session(session_id, final_results)
        
        stats = logger.get_search_statistics()
        
        assert isinstance(stats, SearchStatistics)
        assert stats.total_searches == 1
        assert stats.successful_searches == 1
        assert stats.failed_searches == 0
        assert stats.total_results_found == 1
        assert stats.processing_time_seconds > 0
    
    def test_get_performance_metrics(self):
        """Test getting performance metrics."""
        logger = SearchLogger(self.config)
        
        # Create and complete a session with multiple queries
        session_id = logger.start_search_session("dorian")
        
        result1 = SearchResult(
            url="https://example.com/dorian1",
            title="Dorian Mode",
            snippet="Dorian mode info",
            relevance_score=0.7,
            source_type=SourceType.EDUCATIONAL,
            search_engine="google",
            found_at=datetime.now()
        )
        
        result2 = SearchResult(
            url="https://example.com/dorian2",
            title="Dorian Scale",
            snippet="Dorian scale info",
            relevance_score=0.6,
            source_type=SourceType.EDUCATIONAL,
            search_engine="bing",
            found_at=datetime.now()
        )
        
        result3 = SearchResult(
            url="https://example.com/dorian3",
            title="Dorian Theory",
            snippet="Dorian theory info",
            relevance_score=0.8,
            source_type=SourceType.EDUCATIONAL,
            search_engine="bing",
            found_at=datetime.now()
        )
        
        logger.log_search_query(
            session_id=session_id,
            search_term="dorian mode",
            search_engine="google",
            execution_time_ms=120.0,
            success=True,
            results=[result1]
        )
        
        logger.log_search_query(
            session_id=session_id,
            search_term="dorian scale",
            search_engine="bing",
            execution_time_ms=80.0,
            success=True,
            results=[result2, result3]
        )
        
        final_results = [result1, result2]
        logger.end_search_session(session_id, final_results)
        
        metrics = logger.get_performance_metrics()
        
        assert isinstance(metrics, PerformanceMetrics)
        assert metrics.total_search_time_ms == 200.0
        assert metrics.average_query_time_ms == 100.0
        assert metrics.queries_per_second > 0
        assert metrics.results_per_query == 1.5  # 3 results / 2 queries
        assert metrics.success_rate == 1.0
        assert 'google' in metrics.engine_performance
        assert 'bing' in metrics.engine_performance
    
    def test_generate_search_report(self):
        """Test generating a comprehensive search report."""
        logger = SearchLogger(self.config)
        
        # Create and complete a session
        session_id = logger.start_search_session("mixolydian", "western")
        mock_result = SearchResult(
            url="https://example.com/mixolydian",
            title="Mixolydian Mode",
            snippet="Mixolydian mode info",
            relevance_score=0.75,
            source_type=SourceType.EDUCATIONAL,
            search_engine="duckduckgo",
            found_at=datetime.now()
        )
        
        logger.log_search_query(
            session_id=session_id,
            search_term="mixolydian mode",
            search_engine="duckduckgo",
            execution_time_ms=90.0,
            success=True,
            results=[mock_result]
        )
        
        final_results = [mock_result]
        logger.end_search_session(session_id, final_results)
        
        report = logger.generate_search_report()
        
        assert isinstance(report, dict)
        assert 'report_metadata' in report
        assert 'search_statistics' in report
        assert 'performance_metrics' in report
        assert 'session_summaries' in report
        assert 'engine_usage' in report
        assert 'cultural_context_analysis' in report
        assert 'top_performing_scales' in report
        assert 'search_patterns' in report
        
        # Check session summary
        session_summaries = report['session_summaries']
        assert len(session_summaries) == 1
        assert session_summaries[0]['scale_name'] == 'mixolydian'
        assert session_summaries[0]['cultural_context'] == 'western'
    
    def test_save_search_report_to_file(self):
        """Test saving search report to file."""
        logger = SearchLogger(self.config)
        
        # Create a simple session
        session_id = logger.start_search_session("test")
        logger.end_search_session(session_id, [])
        
        # Generate and save report
        output_path = Path(self.temp_dir) / "test_report.json"
        report = logger.generate_search_report(str(output_path))
        
        assert output_path.exists()
        
        # Verify file contents
        with open(output_path, 'r') as f:
            saved_report = json.load(f)
        
        # Check key sections exist (timestamps may differ slightly)
        assert 'report_metadata' in saved_report
        assert 'search_statistics' in saved_report
        assert 'performance_metrics' in saved_report
        assert saved_report['report_metadata']['total_sessions'] == report['report_metadata']['total_sessions']
    
    def test_session_log_file_creation(self):
        """Test that session log files are created."""
        logger = SearchLogger(self.config)
        
        session_id = logger.start_search_session("test_scale")
        logger.log_search_query(
            session_id=session_id,
            search_term="test scale",
            search_engine="test",
            execution_time_ms=50.0,
            success=True,
            results=[]
        )
        
        logger.end_search_session(session_id, [])
        
        # Check that session log file was created
        log_files = list(logger.log_dir.glob("session_*.json"))
        assert len(log_files) == 1
        
        # Verify log file contents
        with open(log_files[0], 'r') as f:
            session_data = json.load(f)
        
        assert session_data['scale_name'] == 'test_scale'
        assert len(session_data['queries']) == 1
    
    def test_unknown_session_id_error(self):
        """Test error handling for unknown session ID."""
        logger = SearchLogger(self.config)
        
        with pytest.raises(ValueError, match="Unknown session ID"):
            logger.log_search_query(
                session_id="nonexistent",
                search_term="test",
                search_engine="test",
                execution_time_ms=100.0,
                success=True
            )
        
        with pytest.raises(ValueError, match="Unknown session ID"):
            logger.end_search_session("nonexistent", [])
    
    def test_cultural_context_analysis(self):
        """Test cultural context analysis in reports."""
        logger = SearchLogger(self.config)
        
        # Create sessions with different cultural contexts
        result1 = SearchResult(
            url="https://example.com/raga",
            title="Raga",
            snippet="Raga info",
            relevance_score=0.9,
            source_type=SourceType.CULTURAL,
            search_engine="test",
            found_at=datetime.now()
        )
        
        result2 = SearchResult(
            url="https://example.com/maqam",
            title="Maqam",
            snippet="Maqam info",
            relevance_score=0.8,
            source_type=SourceType.CULTURAL,
            search_engine="test",
            found_at=datetime.now()
        )
        
        result3 = SearchResult(
            url="https://example.com/scale",
            title="Scale",
            snippet="Scale info",
            relevance_score=0.7,
            source_type=SourceType.EDUCATIONAL,
            search_engine="test",
            found_at=datetime.now()
        )
        
        session1_id = logger.start_search_session("raga", "indian")
        logger.end_search_session(session1_id, [result1])
        
        session2_id = logger.start_search_session("maqam", "arabic")
        logger.end_search_session(session2_id, [result2])
        
        session3_id = logger.start_search_session("scale", None)
        logger.end_search_session(session3_id, [result3])
        
        report = logger.generate_search_report()
        cultural_analysis = report['cultural_context_analysis']
        
        assert 'indian' in cultural_analysis
        assert 'arabic' in cultural_analysis
        assert 'none' in cultural_analysis  # For sessions without cultural context
        
        assert cultural_analysis['indian']['sessions'] == 1
        assert cultural_analysis['arabic']['sessions'] == 1
        assert cultural_analysis['none']['sessions'] == 1


class TestSearchQuery:
    """Test the SearchQuery data structure."""
    
    def test_search_query_creation(self):
        """Test creation of SearchQuery objects."""
        query = SearchQuery(
            query_id="test_query_1",
            scale_name="major",
            search_term="major scale",
            cultural_context="western",
            search_engine="google",
            timestamp=datetime.now(),
            execution_time_ms=150.5,
            success=True,
            results_count=5
        )
        
        assert query.query_id == "test_query_1"
        assert query.scale_name == "major"
        assert query.search_term == "major scale"
        assert query.cultural_context == "western"
        assert query.search_engine == "google"
        assert query.execution_time_ms == 150.5
        assert query.success == True
        assert query.results_count == 5
        assert query.error_message is None


class TestSearchSession:
    """Test the SearchSession data structure."""
    
    def test_search_session_creation(self):
        """Test creation of SearchSession objects."""
        session = SearchSession(
            session_id="test_session_1",
            scale_name="pentatonic",
            cultural_context="chinese",
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
        
        assert session.session_id == "test_session_1"
        assert session.scale_name == "pentatonic"
        assert session.cultural_context == "chinese"
        assert session.total_queries == 0
        assert session.end_time is None
        assert isinstance(session.queries, list)


if __name__ == "__main__":
    pytest.main([__file__])