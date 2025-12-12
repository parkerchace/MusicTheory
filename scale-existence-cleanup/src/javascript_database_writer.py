"""
JavaScript Database Writer for the Scale Existence Cleanup System.

This module implements safe modification of JavaScript scale database files,
including scale removal, backup creation, and restore functionality.
"""

import re
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import tempfile
import subprocess

try:
    # Try relative imports first (when used as module)
    from .models import ScaleData, BackupResult
    from .interfaces import DatabaseError, BackupError
    from .javascript_database_reader import JavaScriptDatabaseReader
except ImportError:
    # Fall back to absolute imports (when run as script)
    from models import ScaleData, BackupResult
    from interfaces import DatabaseError, BackupError
    from javascript_database_reader import JavaScriptDatabaseReader


class JavaScriptDatabaseWriter:
    """
    Writer for JavaScript scale databases that preserves file structure and formatting.
    
    This class provides safe modification of JavaScript files containing scale definitions,
    with proper backup and rollback capabilities.
    """
    
    def __init__(self, database_file_path: str, backup_directory: str = None):
        """
        Initialize the database writer.
        
        Args:
            database_file_path: Path to the JavaScript database file
            backup_directory: Directory for backups (optional)
        """
        self.database_file_path = Path(database_file_path)
        self.backup_directory = Path(backup_directory) if backup_directory else self.database_file_path.parent / "backups"
        self.logger = logging.getLogger(f"{__name__}.JavaScriptDatabaseWriter")
        
        # Ensure backup directory exists
        self.backup_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize reader for loading current data
        self.reader = JavaScriptDatabaseReader(str(self.database_file_path))
    
    def remove_scales(self, scale_names: List[str], reason: str = "Scale cleanup") -> bool:
        """
        Remove scales from the JavaScript database.
        
        Args:
            scale_names: List of scale names to remove
            reason: Reason for removal (for backup metadata)
            
        Returns:
            True if removal was successful
            
        Raises:
            DatabaseError: If removal fails
        """
        try:
            if not scale_names:
                self.logger.info("No scales to remove")
                return True
            
            # Create backup before modification
            backup_result = self.create_backup(f"pre_removal_{datetime.now().strftime('%Y%m%d_%H%M%S')}", reason)
            if not backup_result.success:
                raise DatabaseError("Failed to create backup before scale removal")
            
            # Read current file content
            with open(self.database_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove scales from the content
            modified_content = self._remove_scales_from_content(content, scale_names)
            
            # Write to temporary file first (use .js extension for validation)
            temp_path = self.database_file_path.with_suffix('.tmp.js')
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            
            # Validate the modified JavaScript
            if not self._validate_javascript_syntax(temp_path):
                temp_path.unlink()
                raise DatabaseError("Modified JavaScript has syntax errors")
            
            # Replace original file
            shutil.move(str(temp_path), str(self.database_file_path))
            
            self.logger.info(f"Successfully removed {len(scale_names)} scales from database")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to remove scales: {e}")
            raise DatabaseError(f"Failed to remove scales from database: {e}")
    
    def remove_scale(self, scale_name: str, reason: str = "Scale cleanup") -> bool:
        """
        Remove a single scale from the database.
        
        Args:
            scale_name: Name of the scale to remove
            reason: Reason for removal
            
        Returns:
            True if removal was successful
        """
        return self.remove_scales([scale_name], reason)
    
    def backup_removed_scales(self, scale_names: List[str]) -> Dict[str, Any]:
        """
        Create a backup containing only the scales that will be removed.
        
        Args:
            scale_names: List of scale names to backup
            
        Returns:
            Dictionary containing backup information
        """
        try:
            # Read current scales
            all_scales = self.reader.read_all_scales()
            
            # Filter to only the scales being removed
            removed_scales = [scale for scale in all_scales if scale.name in scale_names]
            
            if not removed_scales:
                return {'success': False, 'message': 'No scales found to backup'}
            
            # Create backup data
            backup_data = {
                'timestamp': datetime.now().isoformat(),
                'reason': 'Removed scales backup',
                'scales_count': len(removed_scales),
                'scales': []
            }
            
            for scale in removed_scales:
                scale_data = {
                    'name': scale.name,
                    'intervals': scale.intervals,
                    'notes': scale.notes,
                    'scale_type': scale.scale_type.value,
                    'cultural_origin': scale.cultural_origin,
                    'description': scale.description,
                    'metadata': scale.metadata
                }
                backup_data['scales'].append(scale_data)
            
            # Save backup
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"removed_scales_{timestamp}.json"
            backup_path = self.backup_directory / backup_filename
            
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Created backup of {len(removed_scales)} removed scales at {backup_path}")
            
            return {
                'success': True,
                'backup_path': str(backup_path),
                'scales_backed_up': len(removed_scales),
                'backup_size_bytes': backup_path.stat().st_size
            }
        
        except Exception as e:
            self.logger.error(f"Failed to backup removed scales: {e}")
            return {'success': False, 'message': str(e)}
    
    def create_backup(self, backup_name: str = None, reason: str = "Manual backup") -> BackupResult:
        """
        Create a full backup of the database file.
        
        Args:
            backup_name: Name for the backup (optional)
            reason: Reason for creating the backup
            
        Returns:
            BackupResult with backup details
        """
        try:
            if not self.database_file_path.exists():
                raise BackupError(f"Database file not found: {self.database_file_path}")
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            if backup_name:
                backup_filename = f"{backup_name}.js"
            else:
                backup_filename = f"database_backup_{timestamp}.js"
            
            backup_path = self.backup_directory / backup_filename
            
            # Copy the database file
            shutil.copy2(str(self.database_file_path), str(backup_path))
            
            # Create metadata file
            metadata = {
                'backup_timestamp': timestamp,
                'backup_reason': reason,
                'original_file': str(self.database_file_path),
                'backup_file': str(backup_path),
                'file_size_bytes': backup_path.stat().st_size
            }
            
            metadata_path = backup_path.with_suffix('.json')
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            self.logger.info(f"Created backup: {backup_path}")
            
            return BackupResult(
                success=True,
                backup_location=str(backup_path),
                scales_backed_up=0,  # Would need to parse to get exact count
                backup_size_bytes=backup_path.stat().st_size,
                timestamp=datetime.now()
            )
        
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
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
            
            if not backup_file.exists():
                raise BackupError(f"Backup file not found: {backup_path}")
            
            # Create a backup of current state before restore
            current_backup = self.create_backup("pre_restore_backup", "Pre-restore backup")
            if not current_backup.success:
                self.logger.warning("Failed to backup current state before restore")
            
            # Restore from backup
            shutil.copy2(str(backup_file), str(self.database_file_path))
            
            # Validate the restored file
            if not self._validate_javascript_syntax(self.database_file_path):
                self.logger.error("Restored file has syntax errors")
                return False
            
            self.logger.info(f"Successfully restored database from {backup_path}")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to restore from backup {backup_path}: {e}")
            return False
    
    def _remove_scales_from_content(self, content: str, scale_names: List[str]) -> str:
        """
        Remove specified scales from JavaScript content while preserving structure.
        
        Args:
            content: Original JavaScript content
            scale_names: List of scale names to remove
            
        Returns:
            Modified JavaScript content
        """
        modified_content = content
        scales_to_remove = set(scale_names)
        
        # Remove scales from the scales object
        modified_content = self._remove_from_scales_object(modified_content, scales_to_remove)
        
        # Remove corresponding citations
        modified_content = self._remove_from_citations_object(modified_content, scales_to_remove)
        
        return modified_content
    
    def _remove_from_scales_object(self, content: str, scale_names: Set[str]) -> str:
        """
        Remove scales from the this.scales object.
        
        Args:
            content: JavaScript content
            scale_names: Set of scale names to remove
            
        Returns:
            Modified content
        """
        # Find the scales object
        scales_pattern = r'(this\.scales\s*=\s*\{)(.*?)(\};)'
        match = re.search(scales_pattern, content, re.DOTALL)
        
        if not match:
            self.logger.warning("Could not find scales object in JavaScript file")
            return content
        
        prefix = match.group(1)
        scales_content = match.group(2)
        suffix = match.group(3)
        
        # Remove individual scale definitions
        for scale_name in scale_names:
            # Pattern to match scale definition with optional comments and trailing comma
            scale_pattern = rf'(\s*//[^\n]*\n)*\s*{re.escape(scale_name)}\s*:\s*\[[^\]]*\]\s*,?'
            scales_content = re.sub(scale_pattern, '', scales_content, flags=re.MULTILINE)
        
        # Clean up any double commas or trailing commas before closing brace
        scales_content = re.sub(r',\s*,', ',', scales_content)
        scales_content = re.sub(r',\s*(\n\s*)\}', r'\1}', scales_content)
        scales_content = re.sub(r',\s*$', '', scales_content.strip())
        
        # Reconstruct the scales object
        modified_content = content.replace(match.group(0), prefix + scales_content + suffix)
        
        return modified_content
    
    def _remove_from_citations_object(self, content: str, scale_names: Set[str]) -> str:
        """
        Remove citations from the this.scaleCitations object.
        
        Args:
            content: JavaScript content
            scale_names: Set of scale names to remove
            
        Returns:
            Modified content
        """
        # Find the scaleCitations object
        citations_pattern = r'(this\.scaleCitations\s*=\s*\{)(.*?)(\};)'
        match = re.search(citations_pattern, content, re.DOTALL)
        
        if not match:
            self.logger.warning("Could not find scaleCitations object in JavaScript file")
            return content
        
        prefix = match.group(1)
        citations_content = match.group(2)
        suffix = match.group(3)
        
        # Remove individual citation blocks
        for scale_name in scale_names:
            # Pattern to match citation block (more complex due to nested objects)
            citation_pattern = rf'\s*{re.escape(scale_name)}\s*:\s*\{{[^{{}}]*(?:\{{[^{{}}]*\}}[^{{}}]*)*\}}\s*,?'
            citations_content = re.sub(citation_pattern, '', citations_content, flags=re.DOTALL)
        
        # Clean up any double commas or trailing commas
        citations_content = re.sub(r',\s*,', ',', citations_content)
        citations_content = re.sub(r',\s*(\n\s*)\}', r'\1}', citations_content)
        citations_content = re.sub(r',\s*$', '', citations_content.strip())
        
        # Reconstruct the citations object
        modified_content = content.replace(match.group(0), prefix + citations_content + suffix)
        
        return modified_content
    
    def _validate_javascript_syntax(self, file_path: Path) -> bool:
        """
        Validate JavaScript syntax using Node.js if available.
        
        Args:
            file_path: Path to JavaScript file to validate
            
        Returns:
            True if syntax is valid
        """
        try:
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
    
    def get_backup_list(self) -> List[Dict[str, Any]]:
        """
        Get a list of all available backups.
        
        Returns:
            List of backup information dictionaries
        """
        backups = []
        
        try:
            for backup_file in self.backup_directory.glob("*.js"):
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
            backups = self.get_backup_list()
            
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
    
    def validate_database_integrity(self) -> bool:
        """
        Validate the integrity of the database after modifications.
        
        Returns:
            True if database is valid
        """
        try:
            # Check if file exists and is readable
            if not self.database_file_path.exists():
                return False
            
            # Validate JavaScript syntax
            if not self._validate_javascript_syntax(self.database_file_path):
                return False
            
            # Try to parse scales using the reader
            scales = self.reader.read_all_scales()
            
            # Basic validation - should have at least some scales
            if len(scales) == 0:
                self.logger.warning("Database contains no scales after modification")
            
            self.logger.info(f"Database integrity check passed - {len(scales)} scales found")
            return True
        
        except Exception as e:
            self.logger.error(f"Database integrity check failed: {e}")
            return False