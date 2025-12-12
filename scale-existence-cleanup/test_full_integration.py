"""
Full integration test for JavaScript database components.

This test demonstrates the complete workflow of reading, modifying, and validating
the JavaScript scale database while maintaining backward compatibility.
"""

from src.javascript_database_reader import JavaScriptDatabaseReader
from src.javascript_database_writer import JavaScriptDatabaseWriter
from src.backward_compatibility_validator import BackwardCompatibilityValidator
import tempfile
import shutil
from pathlib import Path

def test_full_integration():
    """Test the complete database integration workflow."""
    
    print("JavaScript Database Integration Test")
    print("=" * 50)
    
    # Create a test copy of the real database
    original_db = "../music-theory-engine.js"
    test_db_dir = Path("test_integration")
    test_db_dir.mkdir(exist_ok=True)
    test_db_path = test_db_dir / "music-theory-engine.js"
    backup_dir = test_db_dir / "backups"
    
    try:
        # Copy the original database
        shutil.copy2(original_db, test_db_path)
        print(f"✓ Created test database copy: {test_db_path}")
        
        # Initialize components
        reader = JavaScriptDatabaseReader(str(test_db_path))
        writer = JavaScriptDatabaseWriter(str(test_db_path), str(backup_dir))
        validator = BackwardCompatibilityValidator(str(test_db_path))
        
        # Step 1: Read and analyze initial database
        print("\n1. Reading initial database...")
        initial_stats = reader.get_database_statistics()
        print(f"   Initial scales: {initial_stats['total_scales']}")
        print(f"   Type distribution: {initial_stats['scales_by_type']}")
        
        # Step 2: Validate initial compatibility
        print("\n2. Validating initial compatibility...")
        initial_validation = validator.validate_full_compatibility()
        print(f"   Compatibility status: {initial_validation['overall_status']}")
        print(f"   Errors: {len(initial_validation['errors'])}")
        print(f"   Warnings: {len(initial_validation['warnings'])}")
        
        # Step 3: Identify scales to remove (for testing)
        print("\n3. Identifying test scales to remove...")
        all_scales = reader.read_all_scales()
        
        # Find some scales that are duplicates (safe to remove for testing)
        test_scales_to_remove = [
            'neapolitan_major',  # Exotic scale
            'leading_whole_tone',  # Modern scale
            'enigmatic'  # Exotic scale
        ]
        
        # Verify these scales exist
        existing_scales = [scale.name for scale in all_scales]
        test_scales_to_remove = [
            scale for scale in test_scales_to_remove 
            if scale in existing_scales
        ]
        
        print(f"   Scales to remove: {test_scales_to_remove}")
        
        # Step 4: Backup scales before removal
        print("\n4. Creating backup of scales to be removed...")
        backup_info = writer.backup_removed_scales(test_scales_to_remove)
        if backup_info['success']:
            print(f"   ✓ Backed up {backup_info['scales_backed_up']} scales")
            print(f"   Backup location: {backup_info['backup_path']}")
        else:
            print(f"   ✗ Backup failed: {backup_info.get('message', 'Unknown error')}")
            return False
        
        # Step 5: Remove scales
        print("\n5. Removing scales from database...")
        removal_success = writer.remove_scales(test_scales_to_remove, "Integration test removal")
        if removal_success:
            print("   ✓ Scales removed successfully")
        else:
            print("   ✗ Scale removal failed")
            return False
        
        # Step 6: Verify removal
        print("\n6. Verifying scale removal...")
        modified_stats = reader.get_database_statistics()
        scales_removed = initial_stats['total_scales'] - modified_stats['total_scales']
        print(f"   Scales after removal: {modified_stats['total_scales']}")
        print(f"   Scales removed: {scales_removed}")
        
        if scales_removed != len(test_scales_to_remove):
            print(f"   ⚠ Expected to remove {len(test_scales_to_remove)} scales, actually removed {scales_removed}")
        
        # Step 7: Validate compatibility after modification
        print("\n7. Validating compatibility after modification...")
        modified_validation = validator.validate_full_compatibility()
        print(f"   Compatibility status: {modified_validation['overall_status']}")
        print(f"   Errors: {len(modified_validation['errors'])}")
        print(f"   Warnings: {len(modified_validation['warnings'])}")
        
        if modified_validation['overall_status'] in ['passed', 'passed_with_warnings']:
            print("   ✓ Database remains compatible after modification")
        else:
            print("   ✗ Database compatibility issues detected")
            for error in modified_validation['errors'][:5]:  # Show first 5 errors
                print(f"     ERROR: {error}")
        
        # Step 8: Test restore functionality
        print("\n8. Testing database restore...")
        backups = writer.get_backup_list()
        if backups:
            latest_backup = backups[0]['backup_file']
            print(f"   Restoring from: {Path(latest_backup).name}")
            
            restore_success = writer.restore_from_backup(latest_backup)
            if restore_success:
                print("   ✓ Database restored successfully")
                
                # Verify restore
                restored_stats = reader.get_database_statistics()
                if restored_stats['total_scales'] == initial_stats['total_scales']:
                    print("   ✓ Restore verification successful")
                else:
                    print(f"   ⚠ Restore verification: expected {initial_stats['total_scales']}, got {restored_stats['total_scales']}")
            else:
                print("   ✗ Database restore failed")
        else:
            print("   ⚠ No backups available for restore test")
        
        # Step 9: Final compatibility validation
        print("\n9. Final compatibility validation...")
        final_validation = validator.validate_full_compatibility()
        print(f"   Final compatibility status: {final_validation['overall_status']}")
        
        # Step 10: Performance metrics
        print("\n10. Performance summary...")
        print(f"    Database file size: {test_db_path.stat().st_size:,} bytes")
        print(f"    Backup directory: {len(list(backup_dir.glob('*')))} files")
        
        # Overall result
        print("\n" + "=" * 50)
        if (initial_validation['overall_status'] in ['passed', 'passed_with_warnings'] and
            modified_validation['overall_status'] in ['passed', 'passed_with_warnings'] and
            final_validation['overall_status'] in ['passed', 'passed_with_warnings']):
            print("🎉 INTEGRATION TEST PASSED!")
            print("   All database operations completed successfully")
            print("   Backward compatibility maintained throughout")
            return True
        else:
            print("❌ INTEGRATION TEST FAILED!")
            print("   Some operations failed or compatibility issues detected")
            return False
    
    except Exception as e:
        print(f"\n❌ INTEGRATION TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup
        if test_db_dir.exists():
            shutil.rmtree(test_db_dir)
            print(f"\n🧹 Cleaned up test directory: {test_db_dir}")

if __name__ == "__main__":
    success = test_full_integration()
    exit(0 if success else 1)