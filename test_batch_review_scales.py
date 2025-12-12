#!/usr/bin/env python3
"""
Property-based tests for BatchReviewTool.
**Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from datetime import datetime
import json
import tempfile
import os

from batch_review_scales import BatchReviewTool


# Strategies for generating test data
@st.composite
def valid_source_strategy(draw):
    """Generate valid source objects."""
    return {
        "title": draw(st.text(min_size=1, max_size=100, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_')),
        "url": draw(st.text(min_size=10, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyz0123456789./-:')),
        "snippet": draw(st.text(min_size=0, max_size=500, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?')),
        "quality": draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    }


@st.composite
def review_scale_strategy(draw, scale_id=None):
    """Generate REVIEW-status scale objects."""
    # REVIEW scales should have 0-1 sources
    sources = draw(st.lists(valid_source_strategy(), min_size=0, max_size=1))
    
    # Use scale_id if provided to ensure uniqueness
    if scale_id is not None:
        scale_name = f"review_scale_{scale_id}"
    else:
        scale_name = draw(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'))
    
    return {
        "scale_name": scale_name,
        "display_name": draw(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_')),
        "intervals": draw(st.lists(st.integers(min_value=1, max_value=12), min_size=1, max_size=12)),
        "quality_score": draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
        "recommendation": "REVIEW",
        "reason": draw(st.text(min_size=1, max_size=200, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?')),
        "sources": sources
    }


@st.composite
def mixed_validation_results_strategy(draw):
    """Generate validation results with mixed KEEP/REVIEW/REMOVE scales."""
    # Generate some REVIEW scales (what we're testing) with unique names
    review_count = draw(st.integers(min_value=0, max_value=20))
    review_scales = []
    for i in range(review_count):
        # REVIEW scales should have 0-1 sources
        sources = draw(st.lists(valid_source_strategy(), min_size=0, max_size=1))
        
        review_scale = {
            "scale_name": f"review_scale_{i}",
            "display_name": draw(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_')),
            "intervals": draw(st.lists(st.integers(min_value=1, max_value=12), min_size=1, max_size=12)),
            "quality_score": draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
            "recommendation": "REVIEW",
            "reason": draw(st.text(min_size=1, max_size=200, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?')),
            "sources": sources
        }
        review_scales.append(review_scale)
    
    # Generate some KEEP scales (should be ignored by batch selection) with unique names
    keep_count = draw(st.integers(min_value=0, max_value=10))
    keep_scales = []
    for i in range(keep_count):
        keep_scale = {
            "scale_name": f"keep_scale_{i}",
            "display_name": draw(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_')),
            "intervals": draw(st.lists(st.integers(min_value=1, max_value=12), min_size=1, max_size=12)),
            "quality_score": draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
            "recommendation": "KEEP",
            "reason": draw(st.text(min_size=1, max_size=200, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?')),
            "sources": draw(st.lists(valid_source_strategy(), min_size=2, max_size=5))
        }
        keep_scales.append(keep_scale)
    
    # Combine all scales
    all_scales = review_scales + keep_scales
    
    return {
        "validation_date": "2025-12-12",
        "total_scales": len(all_scales),
        "results": all_scales
    }


class TestBatchReviewTool:
    """Property-based tests for BatchReviewTool."""
    
    def create_temp_files(self, validation_data, js_content="", progress_data=None):
        """Helper to create temporary files for testing."""
        # Create validation JSON file
        validation_fd, validation_path = tempfile.mkstemp(suffix='.json')
        with os.fdopen(validation_fd, 'w') as f:
            json.dump(validation_data, f)
        
        # Create JS file
        js_fd, js_path = tempfile.mkstemp(suffix='.js')
        with os.fdopen(js_fd, 'w') as f:
            f.write(js_content or "this.scaleCitations = {};\n")
        
        # Create progress file if provided
        progress_path = None
        if progress_data is not None:
            progress_fd, progress_path = tempfile.mkstemp(suffix='.json')
            with os.fdopen(progress_fd, 'w') as f:
                json.dump(progress_data, f)
        
        return validation_path, js_path, progress_path
    
    def cleanup_temp_files(self, *paths):
        """Helper to cleanup temporary files."""
        for path in paths:
            if path and os.path.exists(path):
                os.unlink(path)
    
    @given(mixed_validation_results_strategy(), st.integers(min_value=1, max_value=20))
    @settings(suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much])
    def test_batch_selection_returns_correct_count_property(self, validation_data, batch_size):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        For any set of N unreviewed REVIEW-status scales, calling get_next_batch(10) SHALL return exactly min(10, N) scales.
        **Validates: Requirements 3.1**
        """
        # Count REVIEW scales in the validation data
        review_scales = [r for r in validation_data["results"] if r.get("recommendation") == "REVIEW"]
        total_review_count = len(review_scales)
        
        # Skip test if no REVIEW scales
        assume(total_review_count > 0)
        
        validation_path, js_path, progress_path = self.create_temp_files(validation_data)
        
        try:
            # Create batch review tool
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Override progress file path to use our temp file
            if progress_path:
                batch_tool.progress_file_path = progress_path
            
            # Get next batch
            batch = batch_tool.get_next_batch(batch_size)
            
            # Property 6: Batch selection returns correct count
            expected_count = min(batch_size, total_review_count)
            actual_count = len(batch)
            
            assert actual_count == expected_count, \
                f"Expected batch size {expected_count} (min({batch_size}, {total_review_count})), got {actual_count}"
            
            # Verify all returned scales are REVIEW status
            for scale in batch:
                assert scale.get("recommendation") == "REVIEW", \
                    f"Batch should only contain REVIEW scales, found {scale.get('recommendation')} scale: {scale.get('scale_name')}"
            
            # Verify no duplicates in batch
            scale_names = [scale.get("scale_name") for scale in batch]
            assert len(scale_names) == len(set(scale_names)), \
                f"Batch contains duplicate scales: {scale_names}"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path, progress_path)
    
    @given(st.integers(min_value=5, max_value=15))
    @settings(suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much])
    def test_batch_selection_with_progress_tracking(self, num_scales):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        When some scales have already been reviewed, batch selection should exclude them from the count.
        **Validates: Requirements 3.1**
        """
        # Create unique REVIEW scales
        review_scales = []
        for i in range(num_scales):
            review_scale = {
                "scale_name": f"review_scale_{i}",
                "display_name": f"Review Scale {i}",
                "intervals": [0, 2, 4],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }
            review_scales.append(review_scale)
        
        # Create validation data with only REVIEW scales
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": len(review_scales),
            "results": review_scales
        }
        
        # Mark some scales as already reviewed
        total_scales = len(review_scales)
        reviewed_count = min(3, total_scales // 2)  # Review up to half, max 3
        
        reviewed_scale_names = [scale["scale_name"] for scale in review_scales[:reviewed_count]]
        remaining_scale_names = [scale["scale_name"] for scale in review_scales[reviewed_count:]]
        
        progress_data = {
            "lastUpdated": datetime.now().isoformat(),
            "totalReviewScales": total_scales,
            "reviewedScales": reviewed_scale_names,
            "remainingScales": remaining_scale_names,
            "approvedSources": {},
            "rejectedScales": []
        }
        
        validation_path, js_path, progress_path = self.create_temp_files(validation_data, progress_data=progress_data)
        
        try:
            # Create batch review tool
            batch_tool = BatchReviewTool(validation_path, js_path)
            batch_tool.progress_file_path = progress_path
            
            # Test different batch sizes
            for batch_size in [1, 5, 10, 20]:
                batch = batch_tool.get_next_batch(batch_size)
                
                # Property 6: Should return min(batch_size, remaining_unreviewed_count)
                remaining_count = len(remaining_scale_names)
                expected_count = min(batch_size, remaining_count)
                actual_count = len(batch)
                
                assert actual_count == expected_count, \
                    f"With {reviewed_count} reviewed scales and batch_size {batch_size}, expected {expected_count}, got {actual_count}"
                
                # Verify none of the returned scales are in the reviewed list
                returned_names = [scale.get("scale_name") for scale in batch]
                for name in returned_names:
                    assert name not in reviewed_scale_names, \
                        f"Batch returned already reviewed scale: {name}"
                
                # Verify all returned scales are in the remaining list
                for name in returned_names:
                    assert name in remaining_scale_names, \
                        f"Batch returned scale not in remaining list: {name}"
                        
        finally:
            self.cleanup_temp_files(validation_path, js_path, progress_path)
    
    def test_batch_selection_empty_review_scales(self):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        When there are no REVIEW scales, batch selection should return empty list.
        **Validates: Requirements 3.1**
        """
        # Create validation data with only KEEP scales (no REVIEW scales)
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 2,
            "results": [
                {
                    "scale_name": "major",
                    "display_name": "Major",
                    "intervals": [0, 2, 4, 5, 7, 9, 11],
                    "quality_score": 0.9,
                    "recommendation": "KEEP",
                    "reason": "Well documented",
                    "sources": [
                        {"title": "Source 1", "url": "http://example.com/1", "snippet": "Info", "quality": 0.8},
                        {"title": "Source 2", "url": "http://example.com/2", "snippet": "Info", "quality": 0.9}
                    ]
                },
                {
                    "scale_name": "minor",
                    "display_name": "Minor",
                    "intervals": [0, 2, 3, 5, 7, 8, 10],
                    "quality_score": 0.8,
                    "recommendation": "KEEP",
                    "reason": "Well documented",
                    "sources": [
                        {"title": "Source 3", "url": "http://example.com/3", "snippet": "Info", "quality": 0.7},
                        {"title": "Source 4", "url": "http://example.com/4", "snippet": "Info", "quality": 0.8}
                    ]
                }
            ]
        }
        
        validation_path, js_path, progress_path = self.create_temp_files(validation_data)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Test various batch sizes - all should return empty
            for batch_size in [1, 5, 10, 20]:
                batch = batch_tool.get_next_batch(batch_size)
                
                # Property 6: With 0 REVIEW scales, should return empty list
                assert len(batch) == 0, \
                    f"With no REVIEW scales, batch_size {batch_size} should return empty list, got {len(batch)} scales"
                    
        finally:
            self.cleanup_temp_files(validation_path, js_path, progress_path)
    
    def test_batch_selection_all_scales_reviewed(self):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        When all REVIEW scales have been reviewed, batch selection should return empty list.
        **Validates: Requirements 3.1**
        """
        # Create validation data with REVIEW scales
        review_scales = [
            {
                "scale_name": "scale1",
                "display_name": "Scale 1",
                "intervals": [0, 2, 4],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            },
            {
                "scale_name": "scale2",
                "display_name": "Scale 2",
                "intervals": [0, 3, 5],
                "quality_score": 0.4,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": [{"title": "One source", "url": "http://example.com", "snippet": "Info", "quality": 0.5}]
            }
        ]
        
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": len(review_scales),
            "results": review_scales
        }
        
        # Mark all scales as reviewed
        progress_data = {
            "lastUpdated": datetime.now().isoformat(),
            "totalReviewScales": len(review_scales),
            "reviewedScales": ["scale1", "scale2"],
            "remainingScales": [],
            "approvedSources": {},
            "rejectedScales": ["scale1", "scale2"]
        }
        
        validation_path, js_path, progress_path = self.create_temp_files(validation_data, progress_data=progress_data)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            batch_tool.progress_file_path = progress_path
            
            # Test various batch sizes - all should return empty
            for batch_size in [1, 5, 10]:
                batch = batch_tool.get_next_batch(batch_size)
                
                # Property 6: With all scales reviewed, should return empty list
                assert len(batch) == 0, \
                    f"With all scales reviewed, batch_size {batch_size} should return empty list, got {len(batch)} scales"
                    
        finally:
            self.cleanup_temp_files(validation_path, js_path, progress_path)
    
    def test_file_not_found_handling(self):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        The system should handle missing files gracefully.
        **Validates: Requirements 3.1**
        """
        # Test with non-existent validation file
        with pytest.raises(FileNotFoundError, match="Validation JSON file not found"):
            BatchReviewTool("nonexistent.json", "music-theory-engine.js")
        
        # Test with non-existent JS file
        validation_path, _, _ = self.create_temp_files({"results": []})
        try:
            with pytest.raises(FileNotFoundError, match="JavaScript file not found"):
                BatchReviewTool(validation_path, "nonexistent.js")
        finally:
            self.cleanup_temp_files(validation_path)
    
    def test_progress_file_creation(self):
        """
        **Feature: scale-citation-integration, Property 6: Batch selection returns correct count**
        The system should create a default progress file if none exists.
        **Validates: Requirements 3.1, 3.6**
        """
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 1,
            "results": [{
                "scale_name": "test_scale",
                "display_name": "Test Scale",
                "intervals": [0, 2, 4],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }]
        }
        
        validation_path, js_path, _ = self.create_temp_files(validation_data)
        
        try:
            # Clean up any existing progress file first
            if os.path.exists("review_progress.json"):
                os.unlink("review_progress.json")
                
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Progress file should not exist initially
            assert not os.path.exists(batch_tool.progress_file_path), \
                "Progress file should not exist initially"
            
            # Getting progress should create the file
            progress = batch_tool.get_review_progress()
            
            # Verify default structure
            assert "lastUpdated" in progress
            assert "totalReviewScales" in progress
            assert "reviewedScales" in progress
            assert "remainingScales" in progress
            assert "approvedSources" in progress
            assert "rejectedScales" in progress
            
            # Verify file was created
            assert os.path.exists(batch_tool.progress_file_path), \
                "Progress file should be created after get_review_progress()"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path)
            # Clean up progress file if it was created
            if hasattr(batch_tool, 'progress_file_path') and os.path.exists(batch_tool.progress_file_path):
                os.unlink(batch_tool.progress_file_path)

    @given(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'), valid_source_strategy())
    @settings(suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much])
    def test_source_approval_adds_to_references_property(self, scale_name, source):
        """
        **Feature: scale-citation-integration, Property 7: Approval adds source to references**
        For any scale and approved source, after approval the scale's references array SHALL contain the approved source.
        **Validates: Requirements 3.4**
        """
        # Create minimal validation data
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 1,
            "results": [{
                "scale_name": scale_name,
                "display_name": scale_name.replace('_', ' ').title(),
                "intervals": [0, 2, 4],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }]
        }
        
        # Create JS content with scaleCitations object
        js_content = f'''
// Music Theory Engine
this.scaleCitations = {{
  // Existing scales would be here
}};
'''
        
        validation_path, js_path, _ = self.create_temp_files(validation_data, js_content)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Approve the source
            batch_tool.approve_source(scale_name, source)
            
            # Read the updated JS file
            with open(js_path, 'r', encoding='utf-8') as f:
                updated_content = f.read()
            
            # Property 7: The scale's references array should contain the approved source
            # Check that the scale entry was created/updated
            assert scale_name in updated_content, \
                f"Scale {scale_name} should be present in scaleCitations after approval"
            
            # Check that references array exists
            assert 'references:' in updated_content, \
                "References array should be created after source approval"
            
            # Check that validation status was set to manually-verified
            assert 'validationStatus: "manually-verified"' in updated_content, \
                "ValidationStatus should be set to manually-verified after approval"
            
            # Check that validation date was set
            assert 'validationDate:' in updated_content, \
                "ValidationDate should be set after approval"
            
            # Check that source information is present
            source_title = source.get('title', '')
            source_url = source.get('url', '')
            
            if source_title:
                assert source_title in updated_content, \
                    f"Source title '{source_title}' should be present in references"
            
            if source_url:
                assert source_url in updated_content, \
                    f"Source URL '{source_url}' should be present in references"
                    
        finally:
            self.cleanup_temp_files(validation_path, js_path)

    def test_source_approval_with_existing_scale_entry(self):
        """
        **Feature: scale-citation-integration, Property 7: Approval adds source to references**
        When approving a source for a scale that already has an entry, the new source should be added to existing references.
        **Validates: Requirements 3.4**
        """
        scale_name = "dorian"
        source = {
            "title": "Dorian Mode Theory",
            "url": "https://example.com/dorian",
            "snippet": "The Dorian mode is a musical scale",
            "quality": 0.8
        }
        
        # Create validation data
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 1,
            "results": [{
                "scale_name": scale_name,
                "display_name": "Dorian",
                "intervals": [0, 2, 3, 5, 7, 9, 10],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }]
        }
        
        # Create JS content with existing scale entry
        js_content = f'''
// Music Theory Engine
this.scaleCitations = {{
  {scale_name}: {{
    description: "A minor scale with a raised sixth degree",
    culturalContext: {{
      regions: ["Western"],
      traditions: ["Classical", "Jazz"]
    }},
    references: [
      {{
        "type": "academic_source",
        "title": "Existing Reference",
        "url": "https://existing.com",
        "description": "Previous source",
        "source": "Previous Import",
        "category": "verified",
        "verificationStatus": "VERIFIED",
        "verificationDate": "2025-12-11",
        "contentScore": 0.7
      }}
    ],
    validationStatus: "needs-review",
    validationDate: "2025-12-11"
  }}
}};
'''
        
        validation_path, js_path, _ = self.create_temp_files(validation_data, js_content)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Approve the new source
            batch_tool.approve_source(scale_name, source)
            
            # Read the updated JS file
            with open(js_path, 'r', encoding='utf-8') as f:
                updated_content = f.read()
            
            # Property 7: Both the existing and new source should be present
            assert "Existing Reference" in updated_content, \
                "Existing reference should be preserved"
            
            assert source["title"] in updated_content, \
                f"New source title '{source['title']}' should be added to references"
            
            assert source["url"] in updated_content, \
                f"New source URL '{source['url']}' should be added to references"
            
            # Check that validation status was updated
            assert 'validationStatus: "manually-verified"' in updated_content, \
                "ValidationStatus should be updated to manually-verified"
            
            # Check that description and culturalContext were preserved
            assert "A minor scale with a raised sixth degree" in updated_content, \
                "Existing description should be preserved"
            
            assert "culturalContext" in updated_content, \
                "Existing culturalContext should be preserved"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path)

    @given(st.text(min_size=1, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'))
    @settings(suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much])
    def test_rejection_sets_correct_status_property(self, scale_name):
        """
        **Feature: scale-citation-integration, Property 8: Rejection sets correct status**
        For any scale where all sources are rejected, the scale's validationStatus SHALL be "limited-documentation" and it SHALL be marked as reviewed.
        **Validates: Requirements 3.5**
        """
        # Create minimal validation data
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 1,
            "results": [{
                "scale_name": scale_name,
                "display_name": scale_name.replace('_', ' ').title(),
                "intervals": [0, 2, 4],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }]
        }
        
        # Create JS content with scaleCitations object
        js_content = f'''
// Music Theory Engine
this.scaleCitations = {{
  // Existing scales would be here
}};
'''
        
        validation_path, js_path, _ = self.create_temp_files(validation_data, js_content)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Reject all sources for the scale
            batch_tool.reject_all_sources(scale_name)
            
            # Read the updated JS file
            with open(js_path, 'r', encoding='utf-8') as f:
                updated_content = f.read()
            
            # Property 8: The scale's validationStatus should be "limited-documentation"
            assert scale_name in updated_content, \
                f"Scale {scale_name} should be present in scaleCitations after rejection"
            
            assert 'validationStatus: "limited-documentation"' in updated_content, \
                "ValidationStatus should be set to limited-documentation after rejection"
            
            assert 'validationDate:' in updated_content, \
                "ValidationDate should be set after rejection"
            
            # Check that the scale is marked as reviewed in progress
            progress = batch_tool.get_review_progress()
            
            assert scale_name in progress.get('reviewedScales', []), \
                f"Scale {scale_name} should be marked as reviewed in progress"
            
            assert scale_name in progress.get('rejectedScales', []), \
                f"Scale {scale_name} should be marked as rejected in progress"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path)

    def test_rejection_with_existing_scale_entry(self):
        """
        **Feature: scale-citation-integration, Property 8: Rejection sets correct status**
        When rejecting sources for a scale that already has an entry, the existing data should be preserved but status updated.
        **Validates: Requirements 3.5**
        """
        scale_name = "phrygian"
        
        # Create validation data
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 1,
            "results": [{
                "scale_name": scale_name,
                "display_name": "Phrygian",
                "intervals": [0, 1, 3, 5, 7, 8, 10],
                "quality_score": 0.3,
                "recommendation": "REVIEW",
                "reason": "Limited documentation",
                "sources": []
            }]
        }
        
        # Create JS content with existing scale entry
        js_content = f'''
// Music Theory Engine
this.scaleCitations = {{
  {scale_name}: {{
    description: "A minor scale with a lowered second degree",
    culturalContext: {{
      regions: ["Western"],
      traditions: ["Classical", "Modal"]
    }},
    references: [
      {{
        "type": "academic_source",
        "title": "Existing Reference",
        "url": "https://existing.com",
        "description": "Previous source",
        "source": "Previous Import",
        "category": "verified",
        "verificationStatus": "VERIFIED",
        "verificationDate": "2025-12-11",
        "contentScore": 0.7
      }}
    ],
    validationStatus: "needs-review",
    validationDate: "2025-12-11"
  }}
}};
'''
        
        validation_path, js_path, _ = self.create_temp_files(validation_data, js_content)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            
            # Reject all sources for the scale
            batch_tool.reject_all_sources(scale_name)
            
            # Read the updated JS file
            with open(js_path, 'r', encoding='utf-8') as f:
                updated_content = f.read()
            
            # Property 8: ValidationStatus should be updated to limited-documentation
            assert 'validationStatus: "limited-documentation"' in updated_content, \
                "ValidationStatus should be updated to limited-documentation"
            
            # Check that existing data was preserved
            assert "A minor scale with a lowered second degree" in updated_content, \
                "Existing description should be preserved"
            
            assert "culturalContext" in updated_content, \
                "Existing culturalContext should be preserved"
            
            assert "Existing Reference" in updated_content, \
                "Existing references should be preserved"
            
            # Check that the scale is marked as reviewed in progress
            progress = batch_tool.get_review_progress()
            
            assert scale_name in progress.get('reviewedScales', []), \
                f"Scale {scale_name} should be marked as reviewed in progress"
            
            assert scale_name in progress.get('rejectedScales', []), \
                f"Scale {scale_name} should be marked as rejected in progress"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path)

    def test_rejection_updates_progress_tracking(self):
        """
        **Feature: scale-citation-integration, Property 8: Rejection sets correct status**
        When rejecting a scale, it should be properly tracked in the progress system.
        **Validates: Requirements 3.5**
        """
        scale_name = "test_scale"
        
        # Create validation data
        validation_data = {
            "validation_date": "2025-12-12",
            "total_scales": 2,
            "results": [
                {
                    "scale_name": scale_name,
                    "display_name": "Test Scale",
                    "intervals": [0, 2, 4],
                    "quality_score": 0.3,
                    "recommendation": "REVIEW",
                    "reason": "Limited documentation",
                    "sources": []
                },
                {
                    "scale_name": "other_scale",
                    "display_name": "Other Scale",
                    "intervals": [0, 3, 5],
                    "quality_score": 0.4,
                    "recommendation": "REVIEW",
                    "reason": "Limited documentation",
                    "sources": []
                }
            ]
        }
        
        # Create initial progress with the scale in remaining list
        progress_data = {
            "lastUpdated": datetime.now().isoformat(),
            "totalReviewScales": 2,
            "reviewedScales": [],
            "remainingScales": [scale_name, "other_scale"],
            "approvedSources": {},
            "rejectedScales": []
        }
        
        js_content = "this.scaleCitations = {};"
        
        validation_path, js_path, progress_path = self.create_temp_files(validation_data, js_content, progress_data)
        
        try:
            batch_tool = BatchReviewTool(validation_path, js_path)
            batch_tool.progress_file_path = progress_path
            
            # Reject all sources for the scale
            batch_tool.reject_all_sources(scale_name)
            
            # Check updated progress
            updated_progress = batch_tool.get_review_progress()
            
            # Property 8: Scale should be moved from remaining to reviewed/rejected
            assert scale_name in updated_progress.get('reviewedScales', []), \
                f"Scale {scale_name} should be in reviewedScales"
            
            assert scale_name in updated_progress.get('rejectedScales', []), \
                f"Scale {scale_name} should be in rejectedScales"
            
            assert scale_name not in updated_progress.get('remainingScales', []), \
                f"Scale {scale_name} should be removed from remainingScales"
            
            # Other scale should still be in remaining
            assert "other_scale" in updated_progress.get('remainingScales', []), \
                "Other scale should still be in remainingScales"
                
        finally:
            self.cleanup_temp_files(validation_path, js_path, progress_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])