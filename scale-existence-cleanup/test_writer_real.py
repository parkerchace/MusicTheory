from src.javascript_database_writer import JavaScriptDatabaseWriter
from src.javascript_database_reader import JavaScriptDatabaseReader
import tempfile
import shutil
from pathlib import Path

# Create a test copy of the real database
original_db = "../music-theory-engine.js"
test_db_dir = Path("test_database_copy")
test_db_dir.mkdir(exist_ok=True)
test_db_path = test_db_dir / "music-theory-engine.js"

# Copy the original database
shutil.copy2(original_db, test_db_path)

print("Testing JavaScript Database Writer with real data...")
print("=" * 60)

try:
    # Create backup directory
    backup_dir = test_db_dir / "backups"
    
    # Initialize writer and reader
    writer = JavaScriptDatabaseWriter(str(test_db_path), str(backup_dir))
    reader = JavaScriptDatabaseReader(str(test_db_path))
    
    # Get initial statistics
    initial_stats = reader.get_database_statistics()
    print(f"Initial database: {initial_stats['total_scales']} scales")
    
    # Test removing a few scales
    scales_to_remove = ['enigmatic', 'neapolitan_major', 'leading_whole_tone']
    
    print(f"\nRemoving scales: {scales_to_remove}")
    
    # Backup the scales before removal
    backup_info = writer.backup_removed_scales(scales_to_remove)
    print(f"Backed up {backup_info['scales_backed_up']} scales to {backup_info['backup_path']}")
    
    # Remove the scales
    success = writer.remove_scales(scales_to_remove, "Test removal")
    print(f"Removal successful: {success}")
    
    # Verify removal
    final_stats = reader.get_database_statistics()
    print(f"Final database: {final_stats['total_scales']} scales")
    print(f"Scales removed: {initial_stats['total_scales'] - final_stats['total_scales']}")
    
    # Validate database integrity
    integrity_ok = writer.validate_database_integrity()
    print(f"Database integrity: {'OK' if integrity_ok else 'FAILED'}")
    
    # Test restore
    print("\nTesting restore...")
    backups = writer.get_backup_list()
    if backups:
        latest_backup = backups[0]['backup_file']
        print(f"Restoring from: {latest_backup}")
        
        restore_success = writer.restore_from_backup(latest_backup)
        print(f"Restore successful: {restore_success}")
        
        # Verify restore
        restored_stats = reader.get_database_statistics()
        print(f"Restored database: {restored_stats['total_scales']} scales")
        
        if restored_stats['total_scales'] == initial_stats['total_scales']:
            print("✓ Restore verification successful!")
        else:
            print("✗ Restore verification failed!")
    
    print("\nJavaScript Database Writer test completed successfully!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

finally:
    # Cleanup test files
    if test_db_dir.exists():
        shutil.rmtree(test_db_dir)
        print(f"\nCleaned up test directory: {test_db_dir}")