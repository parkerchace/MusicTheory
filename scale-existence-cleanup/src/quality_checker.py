"""
Documentation Quality Checker implementation for the Scale Existence Cleanup System.
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import List, Optional
from urllib.parse import urlparse
import logging

from src.interfaces import QualityCheckerInterface, handle_quality_check_error
from src.models import (
    QualityAssessment, ScaleInformation, ComplianceResult, CompletenessScore,
    FairUseActivity, ComplianceCheck
)
from src.config import SystemConfig

logger = logging.getLogger(__name__)


class DocumentationQualityChecker(QualityCheckerInterface):
    """Implementation of quality checker for scale documentation."""
    
    def __init__(self, config: SystemConfig):
        """Initialize the quality checker."""
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Scale-Existence-Cleanup-Educational-Research/1.0'
        })
        
        # Educational domain patterns
        self.educational_domains = {
            '.edu', '.ac.uk', '.edu.au', '.ac.jp', '.uni-', 'university',
            'college', 'school', 'academic', 'scholar'
        }
        
        # Scale-related keywords for content analysis
        self.scale_keywords = {
            'notes', 'intervals', 'semitones', 'degrees', 'tonic', 'scale',
            'mode', 'chord', 'harmony', 'melody', 'music theory', 'pitch',
            'octave', 'chromatic', 'diatonic', 'pentatonic'
        }
        
        # Educational content indicators
        self.educational_indicators = {
            'lesson', 'tutorial', 'course', 'study', 'learn', 'education',
            'academic', 'research', 'theory', 'analysis', 'explanation',
            'definition', 'example', 'exercise', 'practice'
        }
        
        # Fair use compliance tracking
        self.fair_use_activities: List[FairUseActivity] = []
    
    @handle_quality_check_error
    def evaluate_source_quality(self, url: str, scale_name: str) -> QualityAssessment:
        """Evaluate the quality of a source for scale documentation."""
        logger.info(f"Evaluating source quality for {scale_name}: {url}")
        
        # Log fair use activity
        activity = FairUseActivity(
            activity_type="content_evaluation",
            url=url,
            content_accessed=False,
            educational_purpose=f"Evaluating documentation quality for scale: {scale_name}"
        )
        
        try:
            # Fetch content
            response = self._fetch_content(url)
            if not response:
                return self._create_failed_assessment(scale_name, ["Failed to fetch content"])
            
            activity.content_accessed = True
            activity.content_length = len(response.text)
            
            # Extract scale information
            extracted_info = self.extract_scale_information(response.text, scale_name)
            
            # Assess various quality dimensions
            has_scale_info = self._has_scale_information(response.text, scale_name)
            completeness = extracted_info.completeness_score
            educational_value = self._assess_educational_value(response.text, url)
            source_authority = self._assess_source_authority(url, response.text)
            fair_use_compliant = self._check_fair_use_compliance(url, response.text)
            
            # Identify quality issues
            quality_issues = self._identify_quality_issues(response.text, extracted_info, url)
            
            assessment = QualityAssessment(
                has_scale_information=has_scale_info,
                information_completeness=completeness,
                educational_value=educational_value,
                source_authority=source_authority,
                fair_use_compliant=fair_use_compliant,
                extracted_information=extracted_info,
                quality_issues=quality_issues
            )
            
            return assessment
            
        except Exception as e:
            logger.error(f"Error evaluating source quality: {e}")
            return self._create_failed_assessment(scale_name, [f"Evaluation error: {str(e)}"])
        finally:
            self.fair_use_activities.append(activity)
    
    @handle_quality_check_error
    def extract_scale_information(self, content: str, scale_name: str) -> ScaleInformation:
        """Extract scale information from web content."""
        logger.debug(f"Extracting scale information for: {scale_name}")
        
        # Extract notes
        notes = self._extract_notes(content, scale_name)
        
        # Extract intervals
        intervals = self._extract_intervals(content, scale_name)
        
        # Extract cultural context
        cultural_context = self._extract_cultural_context(content, scale_name)
        
        # Extract description
        description = self._extract_description(content, scale_name)
        
        # Check for musical examples
        musical_examples = self._has_musical_examples(content)
        
        # Check for theoretical explanation
        theoretical_explanation = self._has_theoretical_explanation(content)
        
        # Calculate completeness score
        completeness_score = self._calculate_completeness_score(
            notes, intervals, cultural_context, description,
            musical_examples, theoretical_explanation
        )
        
        return ScaleInformation(
            scale_name=scale_name,
            notes=notes,
            intervals=intervals,
            cultural_context=cultural_context,
            description=description,
            musical_examples=musical_examples,
            theoretical_explanation=theoretical_explanation,
            completeness_score=completeness_score
        )
    
    @handle_quality_check_error
    def check_educational_compliance(self, source: str) -> ComplianceResult:
        """Check if a source complies with educational fair use guidelines."""
        logger.debug(f"Checking educational compliance for: {source}")
        
        issues = []
        recommendations = []
        compliance_score = 1.0
        
        # Check if source is educational
        if source.startswith('http'):
            domain = urlparse(source).netloc.lower()
            is_educational_domain = any(
                edu_pattern in domain for edu_pattern in self.educational_domains
            )
            
            if not is_educational_domain:
                issues.append("Source is not from an educational domain")
                compliance_score -= 0.3
                recommendations.append("Prioritize educational and academic sources")
        
        # Check content length limits (fair use)
        if len(source) > self.config.fair_use.max_content_length_per_source:
            issues.append("Content exceeds fair use length limits")
            compliance_score -= 0.4
            recommendations.append("Limit content extraction to essential information only")
        
        # Ensure educational purpose
        educational_purpose = self.validate_educational_purpose(
            "Scale documentation quality assessment"
        )
        if not educational_purpose:
            issues.append("Operation does not serve clear educational purpose")
            compliance_score -= 0.5
        
        compliance_score = max(0.0, compliance_score)
        is_compliant = compliance_score >= 0.7 and len(issues) == 0
        
        return ComplianceResult(
            is_compliant=is_compliant,
            compliance_score=compliance_score,
            issues=issues,
            recommendations=recommendations
        )
    
    @handle_quality_check_error
    def assess_documentation_completeness(self, info: ScaleInformation) -> CompletenessScore:
        """Assess how complete the scale documentation is."""
        has_notes = len(info.notes) > 0
        has_intervals = len(info.intervals) > 0
        has_description = len(info.description.strip()) > 0
        has_examples = info.musical_examples
        has_cultural_context = len(info.cultural_context.strip()) > 0
        
        # Calculate overall score based on components
        components = [has_notes, has_intervals, has_description, has_examples, has_cultural_context]
        overall_score = sum(components) / len(components)
        
        return CompletenessScore(
            overall_score=overall_score,
            has_notes=has_notes,
            has_intervals=has_intervals,
            has_description=has_description,
            has_examples=has_examples,
            has_cultural_context=has_cultural_context
        )
    
    def validate_educational_purpose(self, operation: str) -> bool:
        """Validate that an operation serves an educational purpose."""
        educational_keywords = {
            'education', 'research', 'study', 'analysis', 'documentation',
            'quality', 'assessment', 'validation', 'academic'
        }
        
        operation_lower = operation.lower()
        return any(keyword in operation_lower for keyword in educational_keywords)
    
    def check_content_usage_limits(self, content: str) -> ComplianceCheck:
        """Check if content usage is within fair use limits."""
        content_length = len(content)
        limit_threshold = self.config.fair_use.max_content_length_per_source
        usage_percentage = (content_length / limit_threshold) * 100
        within_limits = content_length <= limit_threshold
        
        recommendations = []
        if not within_limits:
            recommendations.append("Reduce content extraction to essential information only")
            recommendations.append("Focus on scale-specific data rather than full content")
        
        return ComplianceCheck(
            within_limits=within_limits,
            content_length=content_length,
            limit_threshold=limit_threshold,
            usage_percentage=min(usage_percentage, 100.0),
            recommendations=recommendations
        )
    
    # Private helper methods
    
    def _fetch_content(self, url: str) -> Optional[requests.Response]:
        """Fetch content from URL with error handling."""
        try:
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.warning(f"Failed to fetch content from {url}: {e}")
            return None
    
    def _has_scale_information(self, content: str, scale_name: str) -> bool:
        """Check if content contains actual scale information."""
        text_content = content.lower()
        scale_name_lower = scale_name.lower()
        
        # Check for scale name presence
        has_scale_name = scale_name_lower in text_content
        
        # Check for scale-related keywords
        keyword_count = sum(1 for keyword in self.scale_keywords 
                           if keyword in text_content)
        
        return has_scale_name and keyword_count >= 3
    
    def _assess_educational_value(self, content: str, url: str) -> float:
        """Assess educational value of the content."""
        text_content = content.lower()
        score = 0.0
        
        # Check domain
        domain = urlparse(url).netloc.lower()
        if any(edu_pattern in domain for edu_pattern in self.educational_domains):
            score += 0.4
        
        # Check for educational indicators
        indicator_count = sum(1 for indicator in self.educational_indicators
                             if indicator in text_content)
        score += min(0.4, indicator_count * 0.1)
        
        # Check for structured content
        soup = BeautifulSoup(content, 'html.parser')
        if soup.find_all(['h1', 'h2', 'h3']):  # Has headings
            score += 0.1
        if soup.find_all(['ul', 'ol']):  # Has lists
            score += 0.1
        
        return min(1.0, score)
    
    def _assess_source_authority(self, url: str, content: str) -> float:
        """Assess authority of the source."""
        domain = urlparse(url).netloc.lower()
        score = 0.0
        
        # Educational domains get high authority
        if any(edu_pattern in domain for edu_pattern in self.educational_domains):
            score += 0.5
        
        # Check for author credentials
        text_content = content.lower()
        if any(term in text_content for term in ['professor', 'dr.', 'phd', 'musician']):
            score += 0.2
        
        # Check for references/citations
        if any(term in text_content for term in ['reference', 'citation', 'bibliography']):
            score += 0.2
        
        # Check for publication date (recent is better)
        if 'copyright' in text_content or '20' in content:  # Basic date check
            score += 0.1
        
        return min(1.0, score)
    
    def _check_fair_use_compliance(self, url: str, content: str) -> bool:
        """Check if usage complies with fair use guidelines."""
        # Check content length
        if len(content) > self.config.fair_use.max_content_length_per_source:
            return False
        
        # Check if educational purpose
        if not self.validate_educational_purpose("scale documentation assessment"):
            return False
        
        return True
    
    def _identify_quality_issues(self, content: str, info: ScaleInformation, url: str) -> List[str]:
        """Identify quality issues with the source."""
        issues = []
        
        if not info.notes and not info.intervals:
            issues.append("No musical scale data found")
        
        if len(info.description) < 50:
            issues.append("Insufficient description of the scale")
        
        if not info.musical_examples and not info.theoretical_explanation:
            issues.append("Lacks both musical examples and theoretical explanation")
        
        # Check for commercial content
        text_content = content.lower()
        if any(term in text_content for term in ['buy', 'purchase', 'price', 'sale']):
            issues.append("Contains commercial content")
        
        return issues
    
    def _extract_notes(self, content: str, scale_name: str) -> List[str]:
        """Extract musical notes from content."""
        # Pattern to match note sequences like "C D E F G A B" or "C-D-E-F-G-A-B"
        note_pattern = r'\b[A-G][#b]?(?:[-\s]+[A-G][#b]?){2,}\b'
        matches = re.findall(note_pattern, content, re.IGNORECASE)
        
        notes = []
        for match in matches:
            # Split on common separators
            note_sequence = re.split(r'[-\s]+', match.strip())
            if len(note_sequence) >= 3:  # At least 3 notes for a scale
                notes.extend([note.strip().upper() for note in note_sequence if note.strip()])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_notes = []
        for note in notes:
            if note not in seen:
                seen.add(note)
                unique_notes.append(note)
        
        return unique_notes[:12]  # Limit to 12 notes max
    
    def _extract_intervals(self, content: str, scale_name: str) -> List[int]:
        """Extract interval information from content."""
        # Pattern to match interval sequences like "2-2-1-2-2-2-1" or "W-W-H-W-W-W-H"
        interval_patterns = [
            r'\b\d+(?:[-\s]+\d+){2,}\b',  # Numeric intervals
            r'\b[WH](?:[-\s]+[WH]){2,}\b'  # Whole/Half step notation
        ]
        
        intervals = []
        for pattern in interval_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if 'W' in match.upper() or 'H' in match.upper():
                    # Convert W/H notation to semitones
                    steps = re.split(r'[-\s]+', match.strip())
                    for step in steps:
                        if step.upper() == 'W':
                            intervals.append(2)
                        elif step.upper() == 'H':
                            intervals.append(1)
                else:
                    # Numeric intervals
                    nums = re.split(r'[-\s]+', match.strip())
                    for num in nums:
                        if num.isdigit():
                            intervals.append(int(num))
        
        return intervals[:12]  # Limit to 12 intervals max
    
    def _extract_cultural_context(self, content: str, scale_name: str) -> str:
        """Extract cultural context information."""
        # Cultural keywords to look for
        cultural_terms = [
            'traditional', 'folk', 'ethnic', 'cultural', 'origin', 'history',
            'country', 'region', 'ancient', 'classical', 'medieval', 'renaissance'
        ]
        
        # Geographic terms
        geographic_terms = [
            'indian', 'chinese', 'japanese', 'arabic', 'persian', 'turkish',
            'greek', 'byzantine', 'european', 'african', 'american'
        ]
        
        context_parts = []
        
        # Look for sentences containing cultural terms
        sentences = re.split(r'[.!?]+', content)
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if (scale_name.lower() in sentence_lower and 
                any(term in sentence_lower for term in cultural_terms + geographic_terms)):
                context_parts.append(sentence.strip())
        
        return ' '.join(context_parts[:3])  # Limit to 3 sentences
    
    def _extract_description(self, content: str, scale_name: str) -> str:
        """Extract description of the scale."""
        soup = BeautifulSoup(content, 'html.parser')
        
        # Look for paragraphs containing the scale name
        scale_name_lower = scale_name.lower()
        description_parts = []
        
        for p in soup.find_all('p'):
            text = p.get_text().strip()
            if scale_name_lower in text.lower() and len(text) > 20:
                description_parts.append(text)
        
        # If no paragraphs found, look in other elements
        if not description_parts:
            for element in soup.find_all(['div', 'span', 'td']):
                text = element.get_text().strip()
                if (scale_name_lower in text.lower() and 
                    len(text) > 20 and len(text) < 500):
                    description_parts.append(text)
        
        return ' '.join(description_parts[:2])  # Limit to 2 paragraphs
    
    def _has_musical_examples(self, content: str) -> bool:
        """Check if content has musical examples."""
        text_content = content.lower()
        example_indicators = [
            'example', 'notation', 'staff', 'clef', 'measure', 'chord progression',
            'melody', 'audio', 'sound', 'listen', 'play', 'midi'
        ]
        
        return any(indicator in text_content for indicator in example_indicators)
    
    def _has_theoretical_explanation(self, content: str) -> bool:
        """Check if content has theoretical explanation."""
        text_content = content.lower()
        theory_indicators = [
            'theory', 'analysis', 'structure', 'formula', 'pattern',
            'degree', 'function', 'harmony', 'relationship', 'construction'
        ]
        
        return any(indicator in text_content for indicator in theory_indicators)
    
    def _calculate_completeness_score(self, notes: List[str], intervals: List[int],
                                    cultural_context: str, description: str,
                                    musical_examples: bool, theoretical_explanation: bool) -> float:
        """Calculate completeness score based on extracted information."""
        score = 0.0
        
        # Notes (25%)
        if notes:
            score += 0.25
        
        # Intervals (25%)
        if intervals:
            score += 0.25
        
        # Description (20%)
        if len(description.strip()) > 50:
            score += 0.20
        elif len(description.strip()) > 0:
            score += 0.10
        
        # Cultural context (10%)
        if len(cultural_context.strip()) > 0:
            score += 0.10
        
        # Musical examples (10%)
        if musical_examples:
            score += 0.10
        
        # Theoretical explanation (10%)
        if theoretical_explanation:
            score += 0.10
        
        return min(1.0, score)
    
    def _create_failed_assessment(self, scale_name: str, issues: List[str]) -> QualityAssessment:
        """Create a failed quality assessment."""
        return QualityAssessment(
            has_scale_information=False,
            information_completeness=0.0,
            educational_value=0.0,
            source_authority=0.0,
            fair_use_compliant=False,
            extracted_information=ScaleInformation(scale_name=scale_name),
            quality_issues=issues
        )
