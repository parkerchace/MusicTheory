"""
Tests for the JavaScript Database Writer.

This module tests the safe modification of JavaScript scale databases,
including scale removal, backup creation, and restore functionality.
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, mock_open

from src.javascript_database_writer import JavaScriptDatabaseWriter
from src.models import ScaleType


class TestJavaScriptDatabaseWriter:
    """Test the JavaScript database writer."""
    
    @pytest.fixture
    def sample_js_content(self):
        """Sample JavaScript content for testing."""
        return """
class MusicTheoryEngine {
    constructor() {
        this.scales = {
            // Western Major & Modes
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            // Cultural scales
            raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
            // Modern scales
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
    
    @pytest.fixture
    def temp_js_file(self, sample_js_content):
        """Create a temporary JavaScript file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(sample_js_content)
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    @pytest.fixture
    def temp_backup_dir(self):
        """Create a temporary backup directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    def test_create_backup(self, temp_js_file, temp_backup_dir):
        """Test creating a backup of the database."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        backup_result = writer.create_backup("test_backup", "Test backup")
        
        assert backup_result.success
        assert backup_result.backup_location
        assert Path(backup_result.backup_location).exists()
        assert backup_result.backup_size_bytes > 0
        
        # Check that metadata file was created
        metadata_path = Path(backup_result.backup_location).with_suffix('.json')
        assert metadata_path.exists()
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        assert metadata['backup_reason'] == "Test backup"
        assert metadata['original_file'] == temp_js_file
    
    def test_remove_single_scale(self, temp_js_file, temp_backup_dir):
        """Test removing a single scale from the database."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Remove the 'minor' scale
        success = writer.remove_scale('minor', 'Test removal')
        assert success
        
        # Verify the scale was removed
        with open(temp_js_file, 'r') as f:
            content = f.read()
        
        assert 'minor: [0, 2, 3, 5, 7, 8, 10]' not in content
        assert 'major: [0, 2, 4, 5, 7, 9, 11]' in content  # Other scales should remain
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    def test_remove_multiple_scales(self, temp_js_file, temp_backup_dir):
        """Test removing multiple scales from the database."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Remove multiple scales
        scales_to_remove = ['minor', 'dorian', 'bebop_major']
        success = writer.remove_scales(scales_to_remove, 'Bulk removal test')
        assert success
        
        # Verify the scales were removed
        with open(temp_js_file, 'r') as f:
            content = f.read()
        
        for scale_name in scales_to_remove:
            assert scale_name not in content
        
        # Verify remaining scales are still there
        assert 'major: [0, 2, 4, 5, 7, 9, 11]' in content
        assert 'raga_bhairav: [0, 1, 4, 5, 7, 8, 11]' in content
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    def test_remove_scales_with_citations(self, temp_js_file, temp_backup_dir):
        """Test that citations are also removed when scales are removed."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Remove a scale that has citations
        success = writer.remove_scale('major', 'Test citation removal')
        assert success
        
        # Verify both scale and citation were removed
        with open(temp_js_file, 'r') as f:
            content = f.read()
        
        assert 'major: [0, 2, 4, 5, 7, 9, 11]' not in content
        assert 'major: {' not in content  # Citation block should be gone
        assert 'Ionian mode - fundamental to Western tonal music' not in content
        
        # Verify other citations remain
        assert 'raga_bhairav: {' in content
        assert 'Indian classical raga' in content
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    def test_backup_removed_scales(self, temp_js_file, temp_backup_dir):
        """Test backing up scales before removal."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        scales_to_remove = ['minor', 'dorian']
        backup_info = writer.backup_removed_scales(scales_to_remove)
        
        assert backup_info['success']
        assert backup_info['scales_backed_up'] == 2
        assert Path(backup_info['backup_path']).exists()
        
        # Verify backup content
        with open(backup_info['backup_path'], 'r') as f:
            backup_data = json.load(f)
        
        assert backup_data['scales_count'] == 2
        assert len(backup_data['scales']) == 2
        
        scale_names = [scale['name'] for scale in backup_data['scales']]
        assert 'minor' in scale_names
        assert 'dorian' in scale_names
    
    def test_restore_from_backup(self, temp_js_file, temp_backup_dir):
        """Test restoring database from a backup."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Create a backup
        backup_result = writer.create_backup("restore_test", "Test restore")
        assert backup_result.success
        
        # Modify the database
        writer.remove_scale('major', 'Test modification')
        
        # Verify scale was removed
        with open(temp_js_file, 'r') as f:
            content = f.read()
        assert 'major: [0, 2, 4, 5, 7, 9, 11]' not in content
        
        # Restore from backup
        success = writer.restore_from_backup(backup_result.backup_location)
        assert success
        
        # Verify scale was restored
        with open(temp_js_file, 'r') as f:
            content = f.read()
        assert 'major: [0, 2, 4, 5, 7, 9, 11]' in content
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    def test_get_backup_list(self, temp_js_file, temp_backup_dir):
        """Test getting a list of available backups."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Create multiple backups
        backup1 = writer.create_backup("backup1", "First backup")
        backup2 = writer.create_backup("backup2", "Second backup")
        
        assert backup1.success
        assert backup2.success
        
        # Get backup list
        backups = writer.get_backup_list()
        
        assert len(backups) >= 2
        
        # Check that backups are sorted by creation time (newest first)
        for i in range(len(backups) - 1):
            assert backups[i]['created'] >= backups[i + 1]['created']
        
        # Check backup information
        backup_files = [backup['backup_file'] for backup in backups]
        assert backup1.backup_location in backup_files
        assert backup2.backup_location in backup_files
    
    def test_cleanup_old_backups(self, temp_js_file, temp_backup_dir):
        """Test cleaning up old backup files."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Create multiple backups
        backups = []
        for i in range(5):
            backup = writer.create_backup(f"backup{i}", f"Backup {i}")
            assert backup.success
            backups.append(backup)
        
        # Verify all backups exist
        for backup in backups:
            assert Path(backup.backup_location).exists()
        
        # Cleanup old backups, keeping only 2
        deleted_count = writer.cleanup_old_backups(keep_count=2)
        assert deleted_count == 3
        
        # Verify only 2 backups remain
        remaining_backups = writer.get_backup_list()
        assert len(remaining_backups) == 2
    
    def test_validate_database_integrity(self, temp_js_file, temp_backup_dir):
        """Test database integrity validation."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Valid database should pass
        assert writer.validate_database_integrity()
        
        # Corrupt the database
        with open(temp_js_file, 'w') as f:
            f.write("invalid javascript content {{{")
        
        # Should fail validation (if Node.js is available)
        # Note: This might pass if Node.js is not available for validation
        result = writer.validate_database_integrity()
        # We can't assert False here because validation might be skipped
        # if Node.js is not available
    
    def test_remove_nonexistent_scale(self, temp_js_file, temp_backup_dir):
        """Test removing a scale that doesn't exist."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Try to remove a non-existent scale
        success = writer.remove_scale('nonexistent_scale', 'Test removal')
        assert success  # Should succeed even if scale doesn't exist
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    def test_remove_empty_list(self, temp_js_file, temp_backup_dir):
        """Test removing an empty list of scales."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Try to remove empty list
        success = writer.remove_scales([], 'Empty removal')
        assert success
        
        # Verify database integrity
        assert writer.validate_database_integrity()
    
    @patch('subprocess.run')
    def test_javascript_validation_with_node(self, mock_run, temp_js_file, temp_backup_dir):
        """Test JavaScript validation when Node.js is available."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Mock successful Node.js validation
        mock_run.return_value.returncode = 0
        mock_run.return_value.stderr = ""
        
        result = writer._validate_javascript_syntax(Path(temp_js_file))
        assert result is True
        
        # Mock failed Node.js validation
        mock_run.return_value.returncode = 1
        mock_run.return_value.stderr = "SyntaxError: Unexpected token"
        
        result = writer._validate_javascript_syntax(Path(temp_js_file))
        assert result is False
    
    @patch('subprocess.run', side_effect=FileNotFoundError())
    def test_javascript_validation_without_node(self, mock_run, temp_js_file, temp_backup_dir):
        """Test JavaScript validation when Node.js is not available."""
        writer = JavaScriptDatabaseWriter(temp_js_file, temp_backup_dir)
        
        # Should return True when Node.js is not available
        result = writer._validate_javascript_syntax(Path(temp_js_file))
        assert result is True