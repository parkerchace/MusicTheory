# Academic Validation Tools

## Overview

This collection of tools provides comprehensive validation and documentation support for adding regional scales to the music theory application with proper academic citations and ethnomusicological context. The tools ensure all scales meet academic standards suitable for college-level Music Theory 3 coursework while maintaining compatibility with high school orchestra programs.

## Tools Included

### 1. AcademicValidationUtilities (`academic-validation-utilities.js`)
Core validation utilities for citation formats, bulk accessibility checking, and 12-TET approximation documentation.

**Key Features:**
- Citation format validation for journal articles, books, conference papers
- Bulk URL accessibility checking
- 12-TET approximation documentation validation
- Academic domain verification
- Regional scale template generation
- Comprehensive validation guidelines

### 2. AcademicSourceValidator (`academic-source-validator.js`)
Comprehensive validation tool that integrates all utilities for complete scale documentation validation.

**Key Features:**
- Complete scale package validation
- Academic rigor assessment
- Educational appropriateness checking
- Quality scoring and recommendations
- Detailed validation reports
- Validation history tracking

### 3. Command-Line Validator (`validate-scale-documentation.js`)
Easy-to-use command-line tool for validating scale documentation files.

**Usage:**
```bash
node validate-scale-documentation.js scale-file.json
node validate-scale-documentation.js scale-file.json --save-report
```

### 4. Unit Tests (`test-citation-validation-utilities.js`)
Comprehensive unit tests covering all validation functionality.

**Run Tests:**
```bash
node test-citation-validation-utilities.js
```

## Documentation Guides

### 1. Regional Scale Documentation Guide (`REGIONAL_SCALE_DOCUMENTATION_GUIDE.md`)
Complete guide for adding new regional scales with proper academic citations.

### 2. 12-TET Approximation Methodology Guide (`12TET_APPROXIMATION_METHODOLOGY_GUIDE.md`)
Detailed methodology for documenting traditional scale approximations for orchestral use.

## Quick Start

### Validating Existing Scale Documentation

```javascript
const AcademicSourceValidator = require('./academic-source-validator.js');

const validator = new AcademicSourceValidator();
const scaleData = {
    scaleId: "example_scale",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    // ... complete scale documentation
};

const report = await validator.validateScalePackage(scaleData);
console.log(`Validation ${report.valid ? 'PASSED' : 'FAILED'}`);
console.log(`Score: ${(report.overallScore * 100).toFixed(1)}%`);
```

### Validating Individual Citations

```javascript
const AcademicValidationUtilities = require('./academic-validation-utilities.js');

const validator = new AcademicValidationUtilities();
const citation = {
    type: 'journal_article',
    title: 'Modal Characteristics in Celtic Music',
    authors: ['Breandán Breathnach'],
    journal: 'Ethnomusicology',
    year: 1996,
    volume: '40',
    pages: '442-465',
    url: 'https://doi.org/10.2307/852808'
};

const result = validator.validateCitationFormat(citation);
console.log(`Citation ${result.valid ? 'valid' : 'invalid'}`);
```

### Bulk URL Accessibility Check

```javascript
const validator = new AcademicValidationUtilities();
const urls = [
    'https://jstor.org/article/123',
    'https://doi.org/10.1000/example',
    'https://cambridge.org/journal/article'
];

const results = await validator.bulkAccessibilityCheck(urls);
console.log(`Checked ${results.totalChecked} URLs`);
console.log(`Accessible: ${results.summary.accessibleCount}`);
```

## Validation Criteria

### Academic Standards
- ✅ **NO Wikipedia sources** - Only peer-reviewed academic sources
- ✅ **Minimum 2 sources** - At least one journal article and one book
- ✅ **Complete citations** - Full bibliographic information with page numbers
- ✅ **Accessible URLs** - All sources must have working links
- ✅ **Cultural specificity** - Specific cultural groups and historical periods

### Technical Requirements
- ✅ **12-TET compatibility** - All intervals must be 0-11 semitones
- ✅ **Orchestral compatibility** - Must work with standard instruments
- ✅ **Approximation documentation** - Clear methodology for traditional scales
- ✅ **Educational appropriateness** - Suitable for high school level

### Quality Scoring

| Score Range | Quality Level | Description |
|-------------|---------------|-------------|
| 90-100% | Excellent | Ready for immediate integration |
| 75-89% | Good | Minor improvements recommended |
| 60-74% | Acceptable | Meets minimum standards |
| 40-59% | Needs Improvement | Significant work required |
| 0-39% | Poor | Major revision needed |

## Example Scale Documentation

```javascript
{
    "scaleId": "chacarera_argentina",
    "intervals": [0, 2, 4, 5, 7, 9, 11],
    "description": "Traditional scale from Santiago del Estero, Argentina, used in chacarera folk dance music.",
    
    "culturalContext": {
        "region": "Santiago del Estero Province, Argentina",
        "culturalGroup": "Criollo communities of northern Argentina",
        "historicalPeriod": "Colonial period (17th century) to present",
        "musicalFunction": "Traditional folk dance music, particularly chacarera and zamba"
    },
    
    "tuningSystem": {
        "original": "Traditional guitar tuning with regional variations",
        "approximationMethod": "Standard 12-TET major scale intervals",
        "orchestralInstruments": "Compatible with violin, viola, cello, bass, winds, and brass",
        "limitations": "Traditional guitar techniques may not be fully represented",
        "pedagogicalNotes": "Excellent introduction to South American folk music for high school orchestra"
    },
    
    "references": [
        {
            "type": "book",
            "title": "Argentine Folk Music: Traditions and Transformations",
            "authors": ["Matthew Karush"],
            "publisher": "University of Pittsburgh Press",
            "year": 2017,
            "isbn": "978-0822964445",
            "pages": "89-112",
            "url": "https://www.upress.pitt.edu/books/9780822964445/"
        },
        {
            "type": "journal_article",
            "title": "Modal Characteristics in Argentine Folk Music",
            "authors": ["Carlos Vega"],
            "journal": "Latin American Music Review",
            "year": 1998,
            "volume": "19",
            "issue": "2",
            "pages": "156-178",
            "doi": "10.2307/780200",
            "url": "https://doi.org/10.2307/780200"
        }
    ],
    
    "alternativeSources": [
        {
            "type": "book",
            "title": "Music in Latin America and the Caribbean",
            "authors": ["Malena Kuss"],
            "publisher": "University of Texas Press",
            "year": 2007,
            "isbn": "978-0292714748",
            "pages": "234-267",
            "url": "https://utpress.utexas.edu/books/kusmus"
        }
    ]
}
```

## Common Validation Errors

### Citation Errors
- ❌ **Wikipedia sources** - Use peer-reviewed academic sources instead
- ❌ **Incomplete bibliographic information** - Include all required fields
- ❌ **Broken URLs** - Verify all links are accessible
- ❌ **Missing page numbers** - Include specific page references

### Cultural Attribution Errors
- ❌ **Overly broad attribution** - Be specific about cultural groups
- ❌ **Missing historical context** - Include time periods
- ❌ **Inappropriate cultural appropriation** - Ensure respectful representation

### Technical Errors
- ❌ **Invalid intervals** - Must be integers 0-11 for 12-TET
- ❌ **Missing approximation documentation** - Document methodology
- ❌ **Poor educational context** - Include pedagogical guidance

## Integration Workflow

1. **Research Phase**
   - Identify authentic regional scales
   - Gather peer-reviewed academic sources
   - Document cultural context and significance

2. **Documentation Phase**
   - Create complete scale documentation
   - Follow academic citation standards
   - Document 12-TET approximation methodology

3. **Validation Phase**
   - Run validation tools
   - Address errors and warnings
   - Achieve minimum quality threshold

4. **Integration Phase**
   - Submit validated documentation
   - Integrate into scale library
   - Update educational materials

## Support and Resources

### Academic Databases
- **JSTOR** - Academic journal articles
- **Project MUSE** - Scholarly literature
- **Oxford Music Online** - Music reference works
- **Ethnomusicology Online** - Specialized ethnomusicology content

### Key Journals
- *Ethnomusicology* (Society for Ethnomusicology)
- *The World of Music* (VWB)
- *Yearbook for Traditional Music* (ICTM)
- *Latin American Music Review* (UT Press)

### Validation Commands

```bash
# Validate a scale file
node validate-scale-documentation.js my-scale.json

# Validate and save detailed report
node validate-scale-documentation.js my-scale.json --save-report

# Run all unit tests
node test-citation-validation-utilities.js

# Generate scale template
node -e "
const utils = new (require('./academic-validation-utilities.js'))();
console.log(JSON.stringify(utils.generateRegionalScaleTemplate('african'), null, 2));
"
```

## Troubleshooting

### Common Issues

**"Citation format invalid"**
- Check all required fields are present
- Verify URL format and accessibility
- Ensure no Wikipedia sources

**"Cultural context incomplete"**
- Provide specific cultural group, not just country
- Include historical period and musical function
- Reference ethnomusicological sources

**"Approximation documentation missing"**
- Document original tuning system
- Explain 12-TET approximation methodology
- Acknowledge limitations and provide pedagogical context

**"Academic rigor insufficient"**
- Add more peer-reviewed sources
- Include complete bibliographic information
- Provide alternative sources for redundancy

For additional support, refer to the comprehensive documentation guides or examine the unit tests for examples of valid documentation formats.