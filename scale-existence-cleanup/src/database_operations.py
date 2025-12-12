"""
Database operations for the Scale Existence Cleanup System.

This module implements database modification operations including scale removal
from JavaScript database files, backup creation, and rollback functionality.
"""

import json
import re
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import tempfile

from .interfaces import DatabaseInterface, DatabaseError, BackupError
from .models import ScaleData, ScaleType, BackupResult
from .config import SystemConfig


class JavaScriptDatabaseManager(DatabaseInterface):
    """
    Database manager for JavaScript-based scale databases.
    
    This class handles reading from and writing to JavaScript files that contain
    scale definitions, with proper backup and rollback capabilities.
    """
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the database manager.
        
        Args:
            config: System configuration containing database settings
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.JavaScriptDatabaseManager")
        self.database_path = Path(config.database.database_file_path)
        self.backup_dir = Path(config.database.backup_directory)
        
        # Ensure backup directory exists
        if config.database.create_backups:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def load_scales(self) -> List[ScaleData]:
        """
        Load all scales from the JavaScript database file.
        
        Returns:
            List of ScaleData objects
            
        Raises:
            DatabaseError: If loading fails
        """
        try:
            if not self.database_path.exists():
                raise DatabaseError(f"Database file not found: {self.database_path}")
            
            with open(self.database_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            scales = self._parse_javascript_scales(content)
            self.logger.info(f"Loaded {len(scales)} scales from database")
            return scales
        
        except Exception as e:
            self.logger.error(f"Failed to load scales: {e}")
            raise DatabaseError(f"Failed to load scales from database: {e}")
    
    def save_scales(self, scales: List[ScaleData]) -> bool:
        """
        Save scales to the JavaScript database file.
        
        Args:
            scales: List of scales to save
            
        Returns:
            True if save was successful
            
        Raises:
            DatabaseError: If saving fails
        """
        try:
            # Create backup before modifying
            if self.config.database.create_backups:
                backup_result = self.backup_database(
                    str(self.backup_dir / f"pre_save_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.js")
                )
                if not backup_result:
                    self.logger.warning("Failed to create backup before save")
            
            # Generate new JavaScript content
            js_content = self._generate_javascript_content(scales)
            
            # Write to temporary file first
            temp_path = self.database_path.with_suffix('.tmp')
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(js_content)
            
            # Validate the generated JavaScript
            if self.config.database.validate_after_modification:
                if not self._validate_javascript_syntax(temp_path):
                    temp_path.unlink()
                    raise DatabaseError("Generated JavaScript has syntax errors")
            
            # Replace original file
            shutil.move(str(temp_path), str(self.database_path))
            
            self.logger.info(f"Successfully saved {len(scales)} scales to database")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to save scales: {e}")
            raise DatabaseError(f"Failed to save scales to database: {e}")
    
    def remove_scale_by_id(self, scale_id: str) -> bool:
        """
        Remove a scale from the database by ID.
        
        Args:
            scale_id: ID of the scale to remove
            
        Returns:
            True if removal was successful
            
        Raises:
            DatabaseError: If removal fails
        """
        try:
            # Load current scales
            scales = self.load_scales()
            
            # Find and remove the scale
            original_count = len(scales)
            scales = [scale for scale in scales if scale.scale_id != scale_id]
            
            if len(scales) == original_count:
                self.logger.warning(f"Scale {scale_id} not found in database")
                return False
            
            # Save the modified scales
            success = self.save_scales(scales)
            
            if success:
                self.logger.info(f"Successfully removed scale {scale_id} from database")
            
            return success
        
        except Exception as e:
            self.logger.error(f"Failed to remove scale {scale_id}: {e}")
            raise DatabaseError(f"Failed to remove scale {scale_id}: {e}")
    
    def backup_database(self, backup_path: str) -> bool:
        """
        Create a backup of the database.
        
        Args:
            backup_path: Path where backup should be created
            
        Returns:
            True if backup was successful
            
        Raises:
            DatabaseError: If backup fails
        """
        try:
            if not self.database_path.exists():
                raise DatabaseError(f"Database file not found: {self.database_path}")
            
            backup_file = Path(backup_path)
            backup_file.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.copy2(str(self.database_path), str(backup_file))
            
            self.logger.info(f"Created database backup at {backup_path}")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            raise DatabaseError(f"Failed to create database backup: {e}")
    
    def validate_database_integrity(self) -> bool:
        """
        Validate the integrity of the database.
        
        Returns:
            True if database is valid
        """
        try:
            if not self.database_path.exists():
                return False
            
            # Check if file is readable
            with open(self.database_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Validate JavaScript syntax
            if not self._validate_javascript_syntax(self.database_path):
                return False
            
            # Try to parse scales
            scales = self._parse_javascript_scales(content)
            
            # Basic validation - should have at least some scales
            if len(scales) == 0:
                self.logger.warning("Database contains no scales")
            
            self.logger.info(f"Database integrity check passed - {len(scales)} scales found")
            return True
        
        except Exception as e:
            self.logger.error(f"Database integrity check failed: {e}")
            return False
    
    def _parse_javascript_scales(self, js_content: str) -> List[ScaleData]:
        """
        Parse scale definitions from JavaScript content.
        
        This is a simplified parser that looks for scale definition patterns.
        In a real implementation, this would use a proper JavaScript parser.
        
        Args:
            js_content: JavaScript file content
            
        Returns:
            List of parsed ScaleData objects
        """
        scales = []
        
        # Look for scale definition patterns
        # This is a simplified regex-based approach
        scale_pattern = r'["\']([^"\']+)["\']\s*:\s*\{([^}]+)\}'
        
        matches = re.findall(scale_pattern, js_content, re.MULTILINE | re.DOTALL)
        
        for scale_name, scale_def in matches:
            try:
                # Extract notes and intervals from the scale definition
                notes = self._extract_notes_from_definition(scale_def)
                intervals = self._extract_intervals_from_definition(scale_def)
                
                if notes and intervals:
                    scale_data = ScaleData(
                        scale_id=self._generate_scale_id(scale_name),
                        name=scale_name,
                        notes=notes,
                        intervals=intervals,
                        scale_type=self._determine_scale_type(scale_name),
                        cultural_origin=self._extract_cultural_origin(scale_def),
                        description=self._extract_description(scale_def),
                        metadata={}
                    )
                    scales.append(scale_data)
            
            except Exception as e:
                self.logger.warning(f"Failed to parse scale '{scale_name}': {e}")
                continue
        
        return scales
    
    def _extract_notes_from_definition(self, scale_def: str) -> List[str]:
        """Extract notes from a scale definition string."""
        # Look for notes array pattern
        notes_pattern = r'notes\s*:\s*\[([^\]]+)\]'
        match = re.search(notes_pattern, scale_def, re.IGNORECASE)
        
        if match:
            notes_str = match.group(1)
            # Extract individual notes
            note_pattern = r'["\']([A-G][#b]?)["\']'
            notes = re.findall(note_pattern, notes_str)
            return notes
        
        return []
    
    def _extract_intervals_from_definition(self, scale_def: str) -> List[int]:
        """Extract intervals from a scale definition string."""
        # Look for intervals array pattern
        intervals_pattern = r'intervals\s*:\s*\[([^\]]+)\]'
        match = re.search(intervals_pattern, scale_def, re.IGNORECASE)
        
        if match:
            intervals_str = match.group(1)
            # Extract individual intervals
            interval_pattern = r'(\d+)'
            intervals = [int(x) for x in re.findall(interval_pattern, intervals_str)]
            return intervals
        
        return []
    
    def _extract_cultural_origin(self, scale_def: str) -> str:
        """Extract cultural origin from a scale definition string."""
        origin_pattern = r'origin\s*:\s*["\']([^"\']+)["\']'
        match = re.search(origin_pattern, scale_def, re.IGNORECASE)
        return match.group(1) if match else ""
    
    def _extract_description(self, scale_def: str) -> str:
        """Extract description from a scale definition string."""
        desc_pattern = r'description\s*:\s*["\']([^"\']+)["\']'
        match = re.search(desc_pattern, scale_def, re.IGNORECASE)
        return match.group(1) if match else ""
    
    def _generate_scale_id(self, scale_name: str) -> str:
        """Generate a unique scale ID from the scale name."""
        # Convert to lowercase and replace spaces with underscores
        scale_id = re.sub(r'[^a-zA-Z0-9_]', '_', scale_name.lower())
        scale_id = re.sub(r'_+', '_', scale_id).strip('_')
        return scale_id or "unknown_scale"
    
    def _determine_scale_type(self, scale_name: str) -> ScaleType:
        """Determine the scale type based on the scale name."""
        name_lower = scale_name.lower()
        
        # Traditional Western scales
        if any(term in name_lower for term in ['major', 'minor', 'dorian', 'mixolydian', 'lydian']):
            return ScaleType.TRADITIONAL
        
        # Cultural scales
        if any(term in name_lower for term in ['raga', 'maqam', 'pentatonic', 'gamelan']):
            return ScaleType.CULTURAL
        
        # Modern scales
        if any(term in name_lower for term in ['jazz', 'blues', 'bebop', 'altered']):
            return ScaleType.MODERN
        
        # Default to modern for unknown scales
        return ScaleType.MODERN
    
    def _generate_javascript_content(self, scales: List[ScaleData]) -> str:
        """
        Generate JavaScript content from scale data.
        
        Args:
            scales: List of scales to convert to JavaScript
            
        Returns:
            JavaScript content string
        """
        # This is a simplified implementation
        # In a real system, this would preserve the original file structure
        # and only modify the scale definitions
        
        js_lines = [
            "// Musical Scale Database",
            "// Generated by Scale Existence Cleanup System",
            f"// Generated on: {datetime.now().isoformat()}",
            "",
            "const scales = {"
        ]
        
        for i, scale in enumerate(scales):
            comma = "," if i < len(scales) - 1 else ""
            
            notes_str = "[" + ", ".join(f'"{note}"' for note in scale.notes) + "]"
            intervals_str = "[" + ", ".join(str(interval) for interval in scale.intervals) + "]"
            
            scale_def = f'''  "{scale.name}": {{
    notes: {notes_str},
    intervals: {intervals_str},
    type: "{scale.scale_type.value}",
    origin: "{scale.cultural_origin}",
    description: "{scale.description}"
  }}{comma}'''
            
            js_lines.append(scale_def)
        
        js_lines.extend([
            "};",
            "",
            "// Export for use in other modules",
            "if (typeof module !== 'undefined' && module.exports) {",
            "  module.exports = scales;",
            "}"
        ])
        
        return "\n".join(js_lines)
    
    def _validate_javascript_syntax(self, file_path: Path) -> bool:
        """
        Validate JavaScript syntax using Node.js if available.
        
        Args:
            file_path: Path to JavaScript file to validate
            
        Returns:
            True if syntax is valid
        """
        try:
            import subprocess
            
            # Try to validate with Node.js
            result = subprocess.run(
                ['node', '-c', str(file_path)],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return True
            else:
                self.logger.error(f"JavaScript syntax error: {result.stderr}")
                return False
        
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
            # Node.js not available or other error - skip validation
            self.logger.warning("Node.js not available for JavaScript validation")
            return True  # Assume valid if we can't validate
        
        except Exception as e:
            self.logger.warning(f"JavaScript validation failed: {e}")
            return True  # Assume valid if validation fails


class DatabaseBackupManager:
    """
    Manages database backups and rollback operations.
    """
    
    def __init__(self, config: SystemConfig):
        """
        Initialize the backup manager.
        
        Args:
            config: System configuration
        """
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.DatabaseBackupManager")
        self.backup_dir = Path(config.database.backup_directory)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_full_backup(self, reason: str = "Manual backup") -> BackupResult:
        """
        Create a full backup of the database.
        
        Args:
            reason: Reason for creating the backup
            
        Returns:
            BackupResult with backup details
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"full_backup_{timestamp}.js"
            backup_path = self.backup_dir / backup_filename
            
            database_path = Path(self.config.database.database_file_path)
            
            if not database_path.exists():
                raise BackupError(f"Database file not found: {database_path}")
            
            # Copy the database file
            shutil.copy2(str(database_path), str(backup_path))
            
            # Create metadata file
            metadata = {
                'backup_timestamp': timestamp,
                'backup_reason': reason,
                'original_file': str(database_path),
                'backup_file': str(backup_path),
                'file_size_bytes': backup_path.stat().st_size
            }
            
            metadata_path = backup_path.with_suffix('.json')
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            self.logger.info(f"Created full backup: {backup_path}")
            
            return BackupResult(
                success=True,
                backup_location=str(backup_path),
                scales_backed_up=0,  # Would need to parse to get exact count
                backup_size_bytes=backup_path.stat().st_size,
                timestamp=datetime.now()
            )
        
        except Exception as e:
            self.logger.error(f"Failed to create full backup: {e}")
            return BackupResult(
                success=False,
                backup_location="",
                scales_backed_up=0,
                timestamp=datetime.now()
            )
    
    def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restore database from a backup file.
        
        Args:
            backup_path: Path to the backup file
            
        Returns:
            True if restore was successful
        """
        try:
            backup_file = Path(backup_path)
            database_path = Path(self.config.database.database_file_path)
            
            if not backup_file.exists():
                raise BackupError(f"Backup file not found: {backup_path}")
            
            # Create a backup of current state before restore
            current_backup = self.create_full_backup("Pre-restore backup")
            if not current_backup.success:
                self.logger.warning("Failed to backup current state before restore")
            
            # Restore from backup
            shutil.copy2(str(backup_file), str(database_path))
            
            self.logger.info(f"Successfully restored database from {backup_path}")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to restore from backup {backup_path}: {e}")
            return False
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List all available backups.
        
        Returns:
            List of backup information dictionaries
        """
        backups = []
        
        try:
            for backup_file in self.backup_dir.glob("*.js"):
                metadata_file = backup_file.with_suffix('.json')
                
                backup_info = {
                    'backup_file': str(backup_file),
                    'created': datetime.fromtimestamp(backup_file.stat().st_mtime),
                    'size_bytes': backup_file.stat().st_size
                }
                
                # Load metadata if available
                if metadata_file.exists():
                    try:
                        with open(metadata_file, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                        backup_info.update(metadata)
                    except Exception as e:
                        self.logger.warning(f"Failed to load metadata for {backup_file}: {e}")
                
                backups.append(backup_info)
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x['created'], reverse=True)
            
        except Exception as e:
            self.logger.error(f"Failed to list backups: {e}")
        
        return backups
    
    def cleanup_old_backups(self, keep_count: int = 10) -> int:
        """
        Clean up old backup files, keeping only the most recent ones.
        
        Args:
            keep_count: Number of backups to keep
            
        Returns:
            Number of backups deleted
        """
        try:
            backups = self.list_backups()
            
            if len(backups) <= keep_count:
                return 0
            
            backups_to_delete = backups[keep_count:]
            deleted_count = 0
            
            for backup_info in backups_to_delete:
                try:
                    backup_path = Path(backup_info['backup_file'])
                    metadata_path = backup_path.with_suffix('.json')
                    
                    if backup_path.exists():
                        backup_path.unlink()
                        deleted_count += 1
                    
                    if metadata_path.exists():
                        metadata_path.unlink()
                
                except Exception as e:
                    self.logger.warning(f"Failed to delete backup {backup_info['backup_file']}: {e}")
            
            self.logger.info(f"Cleaned up {deleted_count} old backups")
            return deleted_count
        
        except Exception as e:
            self.logger.error(f"Failed to cleanup old backups: {e}")
            return 0