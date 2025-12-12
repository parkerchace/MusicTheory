# Implementation Plan

- [x] 1. Create Import Tool Foundation





  - [x] 1.1 Create `import_validation_results.py` with ValidationImporter class skeleton


    - Define class with __init__, load_validation_results, extract_keep_scales, extract_review_scales methods
    - Add type hints and docstrings
    - _Requirements: 1.1_
  - [x] 1.2 Write property test for validation status mapping


    - **Property 1: Import correctly maps validation status**
    - **Validates: Requirements 1.1, 4.1, 4.2, 4.3**
  - [x] 1.3 Implement load_validation_results and extraction methods


    - Parse JSON file and filter by recommendation status
    - Handle missing fields gracefully
    - _Requirements: 1.1_

- [x] 2. Implement Citation Format Mapping




  - [x] 2.1 Implement map_to_citation_format method


    - Convert validation source to scaleCitations reference format
    - Set category based on quality score threshold (0.7)
    - Add validationStatus and validationDate fields
    - _Requirements: 1.2, 1.4, 4.1, 4.2, 4.3_
  - [x] 2.2 Write property test for source quality categorization


    - **Property 3: Source quality determines verification category**
    - **Validates: Requirements 1.4**
  - [x] 2.3 Implement reference sorting by quality


    - Sort references array by contentScore descending
    - _Requirements: 2.5_
  - [x] 2.4 Write property test for reference sorting


    - **Property 4: References are sorted by quality**
    - **Validates: Requirements 2.5**

- [x] 3. Implement JS File Update Logic





  - [x] 3.1 Implement update_scale_citations method


    - Read music-theory-engine.js file
    - Parse existing scaleCitations object
    - Merge new references while preserving description/culturalContext
    - Write updated file
    - _Requirements: 1.2, 1.3_
  - [x] 3.2 Write property test for data preservation


    - **Property 2: Existing citation data is preserved during import**
    - **Validates: Requirements 1.3**
  - [x] 3.3 Implement generate_summary method


    - Count updated scales, new references added
    - Output summary to console
    - _Requirements: 1.5_
  - [x] 3.4 Write property test for validation date recording


    - **Property 10: Validation date is recorded on status change**
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Verify Import Tool





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Re-enable UI Citation Display





  - [x] 5.1 Remove "Temporarily disable citation display" code in modular-music-theory.html


    - Uncomment or restore the citation rendering logic
    - Ensure getScaleCitation is called when scale details expand
    - _Requirements: 2.4_
  - [x] 5.2 Add confidence indicator function


    - Create getConfidenceIndicator(status) function
    - Map validationStatus to appropriate emoji/text
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 5.3 Write property test for confidence indicator mapping


    - **Property 5: Confidence indicator matches validation status**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [x] 5.4 Add fallback message for empty references


    - Display "No academic sources found" when references array is empty
    - _Requirements: 5.4_
  - [x] 5.5 Write property test for empty references fallback


    - **Property 9: Empty references show fallback message**
    - **Validates: Requirements 5.4**

- [x] 6. Checkpoint - Verify UI Display





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create Batch Review Tool Foundation





  - [x] 7.1 Create `batch_review_scales.py` with BatchReviewTool class skeleton


    - Define class with __init__, get_review_progress, get_next_batch, save_progress methods
    - Create review_progress.json schema
    - _Requirements: 3.1, 3.6_
  - [x] 7.2 Write property test for batch selection


    - **Property 6: Batch selection returns correct count**
    - **Validates: Requirements 3.1**
  - [x] 7.3 Implement get_next_batch method


    - Load progress, filter unreviewed REVIEW scales
    - Return next 10 (or remaining) scales
    - _Requirements: 3.1_

- [x] 8. Implement Batch Review Workflow




  - [x] 8.1 Implement search_scale method


    - Reuse web scraper logic from scale_web_scraper.py
    - Return list of found sources
    - _Requirements: 3.2_
  - [x] 8.2 Implement present_for_review method


    - Display scale name, current info, and found sources
    - Prompt user for approval/rejection of each source
    - _Requirements: 3.3_
  - [x] 8.3 Implement approve_source method


    - Add approved source to scaleCitations references
    - Update validationStatus to "manually-verified"
    - _Requirements: 3.4_
  - [x] 8.4 Write property test for source approval


    - **Property 7: Approval adds source to references**
    - **Validates: Requirements 3.4**
  - [x] 8.5 Implement reject_all_sources method


    - Set validationStatus to "limited-documentation"
    - Mark scale as reviewed in progress
    - _Requirements: 3.5_
  - [x] 8.6 Write property test for rejection handling


    - **Property 8: Rejection sets correct status**
    - **Validates: Requirements 3.5**

- [x] 9. Implement Progress Persistence




  - [x] 9.1 Implement save_progress method

    - Write current state to review_progress.json
    - Include reviewed scales, remaining count, timestamps
    - _Requirements: 3.6_
  - [x] 9.2 Implement run_batch method

    - Orchestrate full batch review session
    - Handle user cancellation gracefully
    - Show summary at end of batch
    - _Requirements: 3.6_

- [x] 10. Checkpoint - Verify Batch Review Tool





  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Run Initial Import





  - [x] 11.1 Execute import_validation_results.py on current validation data


    - Import all 68 KEEP scales with their verified sources
    - Set validationStatus for all 144 scales
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3_
  - [x] 11.2 Verify import results


    - Check scaleCitations has updated references
    - Verify validationStatus fields are set correctly
    - _Requirements: 1.5_

- [x] 12. Final Checkpoint - Integration Verification





  - Ensure all tests pass, ask the user if questions arise.
