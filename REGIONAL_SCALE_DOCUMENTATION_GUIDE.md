# Regional Scale Documentation Guide

## Overview

This guide provides comprehensive instructions for adding new regional scales to the music theory application with proper academic citations and ethnomusicological context. All scales must meet academic standards suitable for college-level Music Theory 3 coursework while maintaining compatibility with high school orchestra programs.

## Academic Standards Requirements

### Primary Source Requirements
- **NO Wikipedia sources** - All citations must be from peer-reviewed academic sources
- **Minimum 2 sources per scale** - At least one journal article and one book/monograph
- **Accessible URLs required** - All sources must have working, accessible links
- **Complete bibliographic information** - Including page numbers and specific sections
- **Alternative sources recommended** - Backup sources in case primary sources become inaccessible

### Cultural Attribution Standards
- **Specific cultural group identification** - Not just country or region
- **Historical period documentation** - When the scale was documented/used
- **Musical function context** - Traditional use and cultural significance
- **Ethnomusicological validation** - Sources must be from recognized ethnomusicologists

## Scale Documentation Structure

### Required Fields

#### 1. Scale Identification
```javascript
{
    scaleId: "unique_identifier", // kebab-case, descriptive
    intervals: [0, 2, 4, 5, 7, 9, 11], // 12-TET intervals (0-11)
    description: "Brief academic description with cultural context"
}
```

#### 2. Cultural Context (Required)
```javascript
culturalContext: {
    region: "Specific geographic region (e.g., 'Santiago del Estero, Argentina')",
    culturalGroup: "Specific cultural/ethnic group (e.g., 'Quechua communities of the Andes')",
    historicalPeriod: "Documented time period (e.g., 'Pre-Columbian to present')",
    musicalFunction: "Traditional use context (e.g., 'Ceremonial music for harvest festivals')"
}
```

#### 3. Tuning System Documentation (Required)
```javascript
tuningSystem: {
    original: "Description of traditional tuning system with academic references",
    approximationMethod: "12-TET intervals for orchestral compatibility",
    orchestralInstruments: "Compatible with violin, viola, cello, bass, winds, and brass",
    limitations: "Specific limitations of 12-TET approximation",
    pedagogicalNotes: "Educational context for high school orchestra use"
}
```

#### 4. Academic References (Minimum 2 Required)
```javascript
references: [
    {
        type: "journal_article",
        title: "Complete article title",
        authors: ["First Author", "Second Author"],
        journal: "Journal name",
        year: 2020,
        volume: "Volume number",
        issue: "Issue number",
        pages: "Page range (e.g., '123-145')",
        doi: "DOI if available",
        url: "Accessible URL to the article"
    },
    {
        type: "book",
        title: "Complete book title",
        authors: ["Author Name"],
        publisher: "Publisher name",
        year: 2019,
        isbn: "ISBN number",
        pages: "Relevant page range",
        url: "Publisher or library URL"
    }
]
```

#### 5. Alternative Sources (Recommended)
```javascript
alternativeSources: [
    // Backup sources with same format as references
    // Used when primary sources become inaccessible
]
```

## 12-TET Approximation Guidelines

### Documentation Requirements

When documenting traditional scales that use non-12-TET tuning systems:

1. **Original Tuning Description**
   - Document traditional intervals in cents or ratios when possible
   - Reference ethnomusicological sources for traditional tuning
   - Acknowledge regional variations in tuning

2. **Approximation Methodology**
   - Explain which 12-TET intervals were chosen and why
   - Justify approximation choices with academic sources
   - Reference established approximation methodologies

3. **Orchestral Compatibility**
   - Confirm compatibility with standard orchestra instruments
   - Address any instrument-specific considerations
   - Ensure suitability for high school programs

4. **Limitation Acknowledgment**
   - Identify microtonal elements lost in approximation
   - Quantify approximation accuracy where possible
   - Reference scholarly discussion of trade-offs

5. **Pedagogical Context**
   - Provide educational guidance for instructors
   - Suggest cultural context for classroom use
   - Recommend additional cultural resources

### Example Documentation

```javascript
tuningSystem: {
    original: "Traditional mbira tuning uses just intonation ratios with intervals varying by region and instrument maker, as documented by Berliner (1978) and Tracey (1970)",
    approximationMethod: "12-TET intervals selected based on closest semitone approximations to traditional just intonation ratios, following methodology established by Kubik (1985)",
    orchestralInstruments: "Compatible with violin, viola, cello, bass, winds, and brass instruments used in standard high school orchestra programs",
    limitations: "Traditional microtonal inflections approximated to nearest semitone, losing subtle pitch variations that are culturally significant in traditional performance practice (±15-30 cents variation documented)",
    pedagogicalNotes: "Suitable for high school orchestra use when accompanied by cultural context about traditional performance practices and the significance of the original tuning system in Shona culture"
}
```

## Citation Format Standards

### Journal Articles
- **Required**: title, authors, journal, year, volume, pages
- **Recommended**: issue, DOI, URL
- **Format**: Academic citation style with complete bibliographic information

### Books
- **Required**: title, authors, publisher, year
- **Recommended**: ISBN, pages, URL
- **Format**: Complete publication information with specific page references

### Ethnomusicological Studies
- **Required**: title, authors, year, cultural group, region
- **Recommended**: journal, fieldwork dates, methodology
- **Special consideration**: Must demonstrate cultural sensitivity and academic rigor

## Validation Process

### Automated Validation
The system automatically validates:
- Citation format completeness
- URL accessibility
- Academic domain verification
- Required field presence
- 12-TET interval validity (0-11 range)

### Manual Review Requirements
Before integration, manually verify:
- Cultural attribution accuracy
- Source accessibility and relevance
- Ethnomusicological appropriateness
- Educational suitability

## Common Mistakes to Avoid

### Citation Errors
- ❌ Using Wikipedia as a primary source
- ❌ Incomplete bibliographic information
- ❌ Inaccessible or broken URLs
- ❌ Missing page numbers or specific sections

### Cultural Attribution Errors
- ❌ Overly broad cultural attribution (e.g., "African" instead of specific group)
- ❌ Missing historical context
- ❌ Ignoring cultural significance of traditional tuning
- ❌ Inappropriate cultural appropriation

### Technical Errors
- ❌ Intervals outside 0-11 range
- ❌ Missing 12-TET approximation documentation
- ❌ Inadequate limitation acknowledgment
- ❌ Poor pedagogical guidance

## Example: Complete Scale Documentation

```javascript
{
    scaleId: "chacarera_argentina",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: "Traditional scale from Santiago del Estero, Argentina, used in chacarera folk dance music. Represents the modal characteristics of Argentine folk music with Spanish colonial and indigenous influences.",
    
    culturalContext: {
        region: "Santiago del Estero Province, Argentina",
        culturalGroup: "Criollo communities of northern Argentina",
        historicalPeriod: "Colonial period (17th century) to present",
        musicalFunction: "Traditional folk dance music, particularly chacarera and zamba"
    },
    
    tuningSystem: {
        original: "Traditional guitar tuning with regional variations, often using scordatura techniques documented in Argentine folk music traditions",
        approximationMethod: "Standard 12-TET major scale intervals, compatible with European-derived folk guitar traditions",
        orchestralInstruments: "Fully compatible with violin, viola, cello, bass, winds, and brass instruments used in high school orchestra programs",
        limitations: "Traditional guitar techniques and regional tuning variations may not be fully represented in orchestral arrangement",
        pedagogicalNotes: "Excellent introduction to South American folk music traditions, suitable for high school orchestra with cultural context about Argentine folk dance traditions"
    },
    
    references: [
        {
            type: "book",
            title: "Argentine Folk Music: Traditions and Transformations",
            authors: ["Matthew Karush"],
            publisher: "University of Pittsburgh Press",
            year: 2017,
            isbn: "978-0822964445",
            pages: "89-112",
            url: "https://www.upress.pitt.edu/books/9780822964445/"
        },
        {
            type: "journal_article",
            title: "Modal Characteristics in Argentine Folk Music",
            authors: ["Carlos Vega"],
            journal: "Latin American Music Review",
            year: 1998,
            volume: "19",
            issue: "2",
            pages: "156-178",
            doi: "10.2307/780200",
            url: "https://doi.org/10.2307/780200"
        }
    ],
    
    alternativeSources: [
        {
            type: "book",
            title: "Music in Latin America and the Caribbean",
            authors: ["Malena Kuss"],
            publisher: "University of Texas Press",
            year: 2007,
            isbn: "978-0292714748",
            pages: "234-267",
            url: "https://utpress.utexas.edu/books/kusmus"
        }
    ]
}
```

## Integration Checklist

Before submitting a new regional scale:

- [ ] Scale ID is unique and descriptive
- [ ] Intervals are valid 12-TET values (0-11)
- [ ] Cultural context is complete and specific
- [ ] Tuning system documentation addresses all required fields
- [ ] Minimum 2 academic sources with complete citations
- [ ] All URLs are accessible and from academic sources
- [ ] No Wikipedia sources used
- [ ] Alternative sources provided
- [ ] Cultural attribution is respectful and accurate
- [ ] Educational context is appropriate for high school level
- [ ] Approximation limitations are acknowledged
- [ ] Sources demonstrate ethnomusicological rigor

## Resources for Research

### Recommended Academic Databases
- JSTOR (jstor.org)
- Project MUSE (muse.jhu.edu)
- Oxford Music Online (oxfordmusiconline.com)
- Ethnomusicology Online (ethnomusicologyonline.org)

### Key Ethnomusicology Journals
- Ethnomusicology (Society for Ethnomusicology)
- The World of Music (VWB - Verlag für Wissenschaft und Bildung)
- Yearbook for Traditional Music (International Council for Traditional Music)
- Latin American Music Review (University of Texas Press)

### Institutional Resources
- Smithsonian Folkways Recordings
- Library of Congress American Folklife Center
- UNESCO Intangible Cultural Heritage Lists
- Regional ethnomusicology societies and archives

## Support and Validation Tools

Use the `AcademicValidationUtilities` class to validate your documentation:

```javascript
const validator = new AcademicValidationUtilities();

// Validate complete scale documentation
const validation = validator.validateCompleteScaleDocumentation(scaleData);

// Check citation format
const citationValidation = validator.validateCitationFormat(citation);

// Validate 12-TET approximation documentation
const tuningValidation = validator.validate12TETApproximationDocumentation(tuningSystem);
```

This ensures your documentation meets all academic standards before integration into the system.