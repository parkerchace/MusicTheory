from src.backward_compatibility_validator import BackwardCompatibilityValidator
import sys

# Path to the actual music-theory-engine.js file
js_file_path = "../music-theory-engine.js"

try:
    validator = BackwardCompatibilityValidator(js_file_path)
    
    print("Testing Backward Compatibility Validator with real data...")
    print("=" * 70)
    
    # Run full compatibility validation
    results = validator.validate_full_compatibility()
    
    # Generate and display report
    report = validator.generate_compatibility_report(results)
    print(report)
    
    # Summary
    print("\nSUMMARY:")
    print("-" * 20)
    print(f"Overall Status: {results['overall_status'].upper()}")
    
    if results['overall_status'] == 'passed':
        print("✓ All compatibility checks passed!")
    elif results['overall_status'] == 'passed_with_warnings':
        print("⚠ Compatibility checks passed with warnings")
    else:
        print("✗ Compatibility checks failed")
    
    # Show key metrics
    for validation_name, validation_result in results['validations'].items():
        if 'details' in validation_result:
            details = validation_result['details']
            
            if validation_name == 'scale_structure' and 'total_scales' in details:
                print(f"Total scales validated: {details['total_scales']}")
                print(f"Valid scales: {details['valid_scales']}")
                print(f"Invalid scales: {details['invalid_scales']}")
            
            elif validation_name == 'scale_categorization' and 'type_distribution' in details:
                print("Scale type distribution:")
                for scale_type, count in details['type_distribution'].items():
                    print(f"  {scale_type}: {count}")
            
            elif validation_name == 'citation_metadata' and 'citation_coverage' in details:
                coverage = details['citation_coverage']
                print(f"Citation coverage: {coverage:.1%}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nBackward Compatibility Validator test completed!")