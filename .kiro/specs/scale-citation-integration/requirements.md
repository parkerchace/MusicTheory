# Requirements Document

## Introduction

This feature integrates validated scale sources from the web scraper validation report into the music theory app's `scaleCitations` database, re-enables the Academic Info display in the UI, and provides a batch review workflow for the 76 scales that need manual review. The goal is to ensure every scale in the app has proper academic documentation with verified source links.

## Glossary

- **scaleCitations**: JavaScript object in `music-theory-engine.js` storing academic metadata (description, cultural context, references) for each scale
- **Validation Report**: JSON file (`scale_validation_results.json`) containing web search results categorizing scales as KEEP (68), REVIEW (76), or REMOVE (2)
- **KEEP Scale**: Scale with 2+ verified sources confirming its existence as a documented musical scale
- **REVIEW Scale**: Scale with limited documentation (0-1 sources) requiring manual verification
- **Quality Score**: Numeric rating (0.0-1.0) indicating documentation confidence level
- **Batch Review**: Process of reviewing 10 scales at a time with automatic link finding

## Requirements

### Requirement 1

**User Story:** As a developer, I want to import verified sources from the validation report into scaleCitations, so that the app displays accurate academic references for well-documented scales.

#### Acceptance Criteria

1. WHEN the import script runs THEN the System SHALL read the validation results JSON and extract all KEEP-status scales with their sources
2. WHEN a KEEP scale has sources THEN the System SHALL update the corresponding scaleCitations entry with the verified references (title, url, snippet)
3. WHEN updating scaleCitations THEN the System SHALL preserve existing description and culturalContext fields while adding/updating the references array
4. WHEN a source has quality >= 0.7 THEN the System SHALL mark it as "verified" in the reference metadata
5. WHEN the import completes THEN the System SHALL generate a summary showing how many scales were updated

### Requirement 2

**User Story:** As a user, I want to see academic information when I expand a scale's details, so that I can learn about the scale's origins and find reference materials.

#### Acceptance Criteria

1. WHEN a user expands scale details THEN the System SHALL display the scale's description, cultural context, and reference links
2. WHEN a scale has verified references THEN the System SHALL display them as clickable links with source titles
3. WHEN a scale has a quality score THEN the System SHALL display a confidence indicator (✅ Well-documented, ⚠️ Limited docs, ❓ Needs review)
4. WHEN the citation display code is currently disabled THEN the System SHALL re-enable it in modular-music-theory.html
5. WHEN displaying references THEN the System SHALL show the best (highest quality) reference first

### Requirement 3

**User Story:** As a developer, I want to review REVIEW-status scales in batches of 10 with automatic link finding, so that I can efficiently verify scales with limited documentation.

#### Acceptance Criteria

1. WHEN the batch review tool runs THEN the System SHALL select the next 10 unreviewed REVIEW-status scales
2. WHEN processing a batch THEN the System SHALL automatically search for sources using the existing web scraper
3. WHEN search results are found THEN the System SHALL present them to the user for approval/rejection
4. WHEN a user approves a source THEN the System SHALL add it to the scale's references and update the validation status
5. WHEN a user rejects all sources for a scale THEN the System SHALL mark it as "manually-reviewed-no-sources"
6. WHEN a batch is complete THEN the System SHALL save progress and show remaining scales to review

### Requirement 4

**User Story:** As a developer, I want validation status tracked in scaleCitations, so that the UI can show appropriate confidence indicators.

#### Acceptance Criteria

1. WHEN importing validation data THEN the System SHALL add a validationStatus field to each scaleCitations entry
2. WHEN a scale is KEEP status THEN the System SHALL set validationStatus to "verified"
3. WHEN a scale is REVIEW status THEN the System SHALL set validationStatus to "needs-review"
4. WHEN a scale is manually reviewed THEN the System SHALL update validationStatus to "manually-verified" or "limited-documentation"
5. WHEN validationStatus changes THEN the System SHALL record the validation date

### Requirement 5

**User Story:** As a user, I want to see which scales have limited documentation, so that I understand the confidence level of the information displayed.

#### Acceptance Criteria

1. WHEN displaying a scale with validationStatus "verified" THEN the System SHALL show a green checkmark indicator
2. WHEN displaying a scale with validationStatus "needs-review" THEN the System SHALL show an orange warning indicator
3. WHEN displaying a scale with validationStatus "limited-documentation" THEN the System SHALL show a note explaining limited sources are available
4. WHEN a scale has no references THEN the System SHALL display "No academic sources found" instead of empty content
