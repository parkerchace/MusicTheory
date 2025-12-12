"""
Cultural Context and Alternative Name Search Engine for Scale Existence Cleanup System.

This module extends the basic search functionality with cultural context awareness
and alternative name generation for musical scales from different traditions.
"""

import logging
from typing import List, Dict, Set, Optional
from dataclasses import dataclass

try:
    # Try relative imports first (when used as module)
    from .search_engine import MultiEngineSearchEngine
    from .models import SearchResult, SourceType
    from .config import SystemConfig
    from .interfaces import SearchEngineError
except ImportError:
    # Fall back to absolute imports (when run as script)
    from search_engine import MultiEngineSearchEngine
    from models import SearchResult, SourceType
    from config import SystemConfig
    from interfaces import SearchEngineError


@dataclass
class CulturalContext:
    """Represents cultural context information for a scale."""
    culture: str
    region: str
    musical_tradition: str
    alternative_names: List[str]
    search_terms: List[str]
    source_priorities: Dict[SourceType, float]


class CulturalScaleSearchEngine(MultiEngineSearchEngine):
    """
    Enhanced search engine with cultural context awareness and alternative name generation.
    
    This engine extends the basic multi-engine search with:
    - Cultural context-aware search queries
    - Alternative name generation for scales from different traditions
    - Ethnomusicological source prioritization
    """
    
    def __init__(self, config: SystemConfig):
        """Initialize the cultural search engine."""
        super().__init__(config)
        self.logger = logging.getLogger(f"{__name__}.CulturalScaleSearchEngine")
        
        # Initialize cultural knowledge base
        self.cultural_contexts = self._initialize_cultural_contexts()
        self.alternative_name_generators = self._initialize_alternative_generators()
        self.ethnomusicological_sources = self._initialize_ethnomusicological_sources()
        
        self.logger.info(f"Initialized cultural search engine with {len(self.cultural_contexts)} cultural contexts")
    
    def search_scale_with_cultural_context(self, scale_name: str, cultural_context: str = None) -> List[SearchResult]:
        """
        Search for scale information with cultural context awareness.
        
        Args:
            scale_name: Name of the scale to search for
            cultural_context: Cultural context (e.g., 'indian', 'arabic', 'chinese')
            
        Returns:
            List of search results with cultural context prioritization
        """
        if not scale_name.strip():
            raise SearchEngineError("Scale name cannot be empty")
        
        all_results = []
        
        # Get cultural context information
        context_info = self._get_cultural_context(cultural_context) if cultural_context else None
        
        # Generate alternative names based on cultural context
        alternative_names = self.generate_alternative_names(scale_name, cultural_context)
        
        # Perform searches with cultural awareness
        search_terms = self._generate_cultural_search_terms(scale_name, context_info)
        
        for term in search_terms:
            try:
                # Use the base multi-engine search for each term
                results = super().search_scale(term, cultural_context)
                all_results.extend(results)
            except SearchEngineError as e:
                self.logger.warning(f"Cultural search failed for term '{term}': {e}")
        
        # Search with alternative names
        for alt_name in alternative_names:
            try:
                alt_results = super().search_scale(alt_name, cultural_context)
                all_results.extend(alt_results)
            except SearchEngineError as e:
                self.logger.warning(f"Alternative name search failed for '{alt_name}': {e}")
        
        # Deduplicate and apply cultural prioritization
        unique_results = self._deduplicate_results(all_results)
        prioritized_results = self._apply_cultural_prioritization(unique_results, context_info)
        
        # Sort by relevance with cultural bonuses
        sorted_results = sorted(prioritized_results, key=lambda x: x.relevance_score, reverse=True)
        
        self.logger.info(f"Found {len(sorted_results)} culturally-aware results for '{scale_name}'")
        return sorted_results
    
    def generate_alternative_names(self, scale_name: str, cultural_context: str = None) -> List[str]:
        """
        Generate alternative names for a scale based on cultural context.
        
        Args:
            scale_name: Primary name of the scale
            cultural_context: Cultural context for name generation
            
        Returns:
            List of alternative names
        """
        alternatives = set()
        scale_name_lower = scale_name.lower()
        
        # Add configured alternative names
        if scale_name in self.config.scale_alternative_names:
            alternatives.update(self.config.scale_alternative_names[scale_name])
        
        # Generate cultural alternatives
        if cultural_context and cultural_context in self.alternative_name_generators:
            generator = self.alternative_name_generators[cultural_context]
            cultural_alternatives = generator(scale_name)
            alternatives.update(cultural_alternatives)
        
        # Generate common musical alternatives
        alternatives.update(self._generate_common_alternatives(scale_name))
        
        # Remove the original name from alternatives
        alternatives.discard(scale_name)
        alternatives.discard(scale_name_lower)
        
        return list(alternatives)
    
    def evaluate_search_relevance(self, result: SearchResult, scale_name: str, cultural_context: str = None) -> float:
        """
        Enhanced relevance evaluation with cultural context awareness.
        
        Args:
            result: Search result to evaluate
            scale_name: Name of the scale being searched
            cultural_context: Cultural context for evaluation
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        # Start with base relevance
        base_relevance = super().evaluate_search_relevance(result, scale_name)
        
        # Apply cultural context bonuses
        cultural_bonus = 0.0
        
        if cultural_context:
            context_info = self._get_cultural_context(cultural_context)
            if context_info:
                cultural_bonus = self._calculate_cultural_bonus(result, context_info)
        
        # Apply ethnomusicological source bonus
        ethnomusicological_bonus = self._calculate_ethnomusicological_bonus(result)
        
        # Combine scores
        total_relevance = base_relevance + cultural_bonus + ethnomusicological_bonus
        
        return min(total_relevance, 1.0)
    
    def _initialize_cultural_contexts(self) -> Dict[str, CulturalContext]:
        """Initialize the cultural context knowledge base."""
        contexts = {}
        
        # Indian classical music
        contexts['indian'] = CulturalContext(
            culture='indian',
            region='South Asia',
            musical_tradition='Hindustani/Carnatic',
            alternative_names=['raga', 'raag', 'ragam'],
            search_terms=['raga', 'hindustani', 'carnatic', 'indian classical', 'swar'],
            source_priorities={
                SourceType.CULTURAL: 1.0,
                SourceType.ACADEMIC: 0.9,
                SourceType.EDUCATIONAL: 0.8,
                SourceType.COMMERCIAL: 0.3
            }
        )
        
        # Arabic/Middle Eastern music
        contexts['arabic'] = CulturalContext(
            culture='arabic',
            region='Middle East/North Africa',
            musical_tradition='Maqam',
            alternative_names=['maqam', 'makam', 'maqām'],
            search_terms=['maqam', 'arabic music', 'middle eastern', 'quarter tone'],
            source_priorities={
                SourceType.CULTURAL: 1.0,
                SourceType.ACADEMIC: 0.9,
                SourceType.EDUCATIONAL: 0.8,
                SourceType.COMMERCIAL: 0.3
            }
        )
        
        # Chinese traditional music
        contexts['chinese'] = CulturalContext(
            culture='chinese',
            region='East Asia',
            musical_tradition='Traditional Chinese',
            alternative_names=['diao', 'gong', 'yu'],
            search_terms=['chinese traditional', 'pentatonic', 'guqin', 'erhu'],
            source_priorities={
                SourceType.CULTURAL: 1.0,
                SourceType.ACADEMIC: 0.9,
                SourceType.EDUCATIONAL: 0.8,
                SourceType.COMMERCIAL: 0.3
            }
        )
        
        # Japanese traditional music
        contexts['japanese'] = CulturalContext(
            culture='japanese',
            region='East Asia',
            musical_tradition='Traditional Japanese',
            alternative_names=['choshi', 'ritsu', 'ryo'],
            search_terms=['japanese traditional', 'gagaku', 'koto', 'shamisen'],
            source_priorities={
                SourceType.CULTURAL: 1.0,
                SourceType.ACADEMIC: 0.9,
                SourceType.EDUCATIONAL: 0.8,
                SourceType.COMMERCIAL: 0.3
            }
        )
        
        # Western classical/jazz
        contexts['western'] = CulturalContext(
            culture='western',
            region='Europe/Americas',
            musical_tradition='Classical/Jazz/Popular',
            alternative_names=['mode', 'scale', 'tonality'],
            search_terms=['classical', 'jazz', 'blues', 'folk', 'mode'],
            source_priorities={
                SourceType.EDUCATIONAL: 1.0,
                SourceType.ACADEMIC: 0.9,
                SourceType.CULTURAL: 0.7,
                SourceType.COMMERCIAL: 0.5
            }
        )
        
        return contexts
    
    def _initialize_alternative_generators(self) -> Dict[str, callable]:
        """Initialize alternative name generators for different cultures."""
        generators = {}
        
        def indian_alternatives(scale_name: str) -> List[str]:
            """Generate Indian classical music alternatives."""
            alternatives = []
            name_lower = scale_name.lower()
            
            # Common raga name patterns
            if 'raga' not in name_lower and 'raag' not in name_lower:
                alternatives.extend([f"raga {scale_name}", f"raag {scale_name}"])
            
            # Hindustani/Carnatic variations
            alternatives.extend([f"{scale_name} raga", f"{scale_name} ragam"])
            
            # Common Indian scale name mappings
            indian_mappings = {
                'major': ['bilawal', 'bilaval'],
                'minor': ['asavari', 'natural minor'],
                'dorian': ['kafi'],
                'mixolydian': ['khamaj'],
                'pentatonic': ['bhupali', 'mohana']
            }
            
            for western, indian_names in indian_mappings.items():
                if western in name_lower:
                    alternatives.extend(indian_names)
            
            return alternatives
        
        def arabic_alternatives(scale_name: str) -> List[str]:
            """Generate Arabic/Middle Eastern alternatives."""
            alternatives = []
            name_lower = scale_name.lower()
            
            # Maqam name patterns
            if 'maqam' not in name_lower:
                alternatives.extend([f"maqam {scale_name}", f"makam {scale_name}"])
            
            # Common Arabic scale mappings
            arabic_mappings = {
                'major': ['ajam', 'ionian'],
                'minor': ['nahawand'],
                'phrygian': ['hijaz', 'hijazkar'],
                'harmonic minor': ['hijaz']
            }
            
            for western, arabic_names in arabic_mappings.items():
                if western in name_lower:
                    alternatives.extend(arabic_names)
            
            return alternatives
        
        def chinese_alternatives(scale_name: str) -> List[str]:
            """Generate Chinese traditional alternatives."""
            alternatives = []
            name_lower = scale_name.lower()
            
            # Chinese scale name patterns
            chinese_mappings = {
                'pentatonic': ['gong', 'shang', 'jue', 'zhi', 'yu'],
                'major pentatonic': ['gong diao'],
                'minor pentatonic': ['yu diao']
            }
            
            for western, chinese_names in chinese_mappings.items():
                if western in name_lower:
                    alternatives.extend(chinese_names)
            
            return alternatives
        
        generators['indian'] = indian_alternatives
        generators['arabic'] = arabic_alternatives
        generators['chinese'] = chinese_alternatives
        
        return generators
    
    def _initialize_ethnomusicological_sources(self) -> Set[str]:
        """Initialize list of known ethnomusicological sources."""
        return {
            'ethnomusicology.org',
            'jstor.org',
            'academia.edu',
            'researchgate.net',
            'musicology',
            'ethnomusicology',
            'worldmusic',
            'traditional',
            'cultural',
            'anthropology'
        }
    
    def _get_cultural_context(self, cultural_context: str) -> Optional[CulturalContext]:
        """Get cultural context information."""
        return self.cultural_contexts.get(cultural_context.lower()) if cultural_context else None
    
    def _generate_cultural_search_terms(self, scale_name: str, context_info: Optional[CulturalContext]) -> List[str]:
        """Generate culturally-aware search terms."""
        terms = []
        
        # Base search terms
        base_terms = self.config.get_search_terms_for_scale(scale_name, context_info.culture if context_info else "")
        terms.extend(base_terms)
        
        if context_info:
            # Add cultural search terms
            for cultural_term in context_info.search_terms:
                terms.append(f'"{scale_name}" {cultural_term}')
                terms.append(f'{scale_name} {cultural_term}')
            
            # Add alternative name searches
            for alt_name in context_info.alternative_names:
                terms.append(f'"{scale_name}" {alt_name}')
        
        return terms
    
    def _generate_common_alternatives(self, scale_name: str) -> List[str]:
        """Generate common musical alternatives for any scale."""
        alternatives = []
        name_lower = scale_name.lower()
        
        # Common scale type alternatives
        common_mappings = {
            'major': ['ionian', 'diatonic major'],
            'minor': ['natural minor', 'aeolian'],
            'dorian': ['dorian mode'],
            'phrygian': ['phrygian mode'],
            'lydian': ['lydian mode'],
            'mixolydian': ['mixolydian mode'],
            'locrian': ['locrian mode'],
            'pentatonic': ['pentatonic scale', 'five-note scale'],
            'blues': ['blues scale', 'blue notes'],
            'chromatic': ['twelve-tone', '12-tone']
        }
        
        for scale_type, alts in common_mappings.items():
            if scale_type in name_lower:
                alternatives.extend(alts)
        
        # Add "scale" suffix if not present
        if 'scale' not in name_lower and 'mode' not in name_lower:
            alternatives.append(f"{scale_name} scale")
        
        return alternatives
    
    def _apply_cultural_prioritization(self, results: List[SearchResult], context_info: Optional[CulturalContext]) -> List[SearchResult]:
        """Apply cultural prioritization to search results."""
        if not context_info:
            return results
        
        for result in results:
            # Apply source type priority multiplier
            priority_multiplier = context_info.source_priorities.get(result.source_type, 0.5)
            result.relevance_score *= priority_multiplier
            
            # Ensure score stays within bounds
            result.relevance_score = min(result.relevance_score, 1.0)
        
        return results
    
    def _calculate_cultural_bonus(self, result: SearchResult, context_info: CulturalContext) -> float:
        """Calculate cultural context bonus for a search result."""
        bonus = 0.0
        content = (result.title + " " + result.snippet).lower()
        
        # Bonus for cultural terms
        for term in context_info.search_terms:
            if term.lower() in content:
                bonus += 0.05
        
        # Bonus for alternative names
        for alt_name in context_info.alternative_names:
            if alt_name.lower() in content:
                bonus += 0.1
        
        # Bonus for cultural region mentions
        if context_info.region.lower() in content:
            bonus += 0.05
        
        return min(bonus, 0.3)  # Cap cultural bonus at 0.3
    
    def _calculate_ethnomusicological_bonus(self, result: SearchResult) -> float:
        """Calculate bonus for ethnomusicological sources."""
        bonus = 0.0
        url_lower = result.url.lower()
        content = (result.title + " " + result.snippet).lower()
        
        # Check URL for ethnomusicological sources
        for source in self.ethnomusicological_sources:
            if source in url_lower:
                bonus += 0.1
                break
        
        # Check content for ethnomusicological terms
        ethnomusicological_terms = ['ethnomusicology', 'traditional music', 'folk music', 'cultural music']
        for term in ethnomusicological_terms:
            if term in content:
                bonus += 0.05
                break
        
        return min(bonus, 0.15)  # Cap ethnomusicological bonus at 0.15