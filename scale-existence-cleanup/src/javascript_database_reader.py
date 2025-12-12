"""
JavaScript Database Reader for the Scale Existence Cleanup System.

This module implements parsing of the existing music-theory-engine.js scale definitions
and converts them to Python data structures for processing.
"""

import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

try:
    # Try relative imports first (when used as module)
    from .models import ScaleData, ScaleType
    from .interfaces import DatabaseError
except ImportError:
    # Fall back to absolute imports (when run as script)
    from models import ScaleData, ScaleType
    from interfaces import DatabaseError


@dataclass
class ScaleCitation:
    """Represents citation information for a scale."""
    description: str
    cultural_context: Dict[str, str]
    references: List[Dict[str, Any]]


class JavaScriptScaleParser:
    """
    Parser for JavaScript scale definitions from music-theory-engine.js.
    
    This parser handles the specific format used in the music theory engine,
    including scale intervals, cultural context, and citation information.
    """
    
    def __init__(self):
        """Initialize the parser."""
        self.logger = logging.getLogger(f"{__name__}.JavaScriptScaleParser")
        self.chromatic_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    def parse_scales_from_file(self, js_file_path: str) -> List[ScaleData]:
        """
        Parse scales from a JavaScript file.
        
        Args:
            js_file_path: Path to the JavaScript file containing scale definitions
            
        Returns:
            List of ScaleData objects
            
        Raises:
            DatabaseError: If parsing fails
        """
        try:
            js_path = Path(js_file_path)
            if not js_path.exists():
                raise DatabaseError(f"JavaScript file not found: {js_file_path}")
            
            with open(js_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse scales and citations
            scales_dict = self._extract_scales_object(content)
            citations_dict = self._extract_citations_object(content)
            
            # Convert to ScaleData objects
            scales = self._convert_to_scale_data(scales_dict, citations_dict)
            
            self.logger.info(f"Successfully parsed {len(scales)} scales from {js_file_path}")
            return scales
        
        except Exception as e:
            self.logger.error(f"Failed to parse scales from {js_file_path}: {e}")
            raise DatabaseError(f"Failed to parse JavaScript scales: {e}")
    
    def _extract_scales_object(self, js_content: str) -> Dict[str, List[int]]:
        """
        Extract the scales object from JavaScript content.
        
        Args:
            js_content: JavaScript file content
            
        Returns:
            Dictionary mapping scale names to interval arrays
        """
        scales = {}
        
        # Find the scales object definition
        scales_pattern = r'this\.scales\s*=\s*\{(.*?)\};'
        match = re.search(scales_pattern, js_content, re.DOTALL)
        
        if not match:
            raise DatabaseError("Could not find scales object in JavaScript file")
        
        scales_content = match.group(1)
        
        # Parse individual scale definitions
        # Pattern to match: scale_name: [0, 2, 4, 5, 7, 9, 11],
        scale_pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\[([\d\s,]+)\]'
        
        for match in re.finditer(scale_pattern, scales_content):
            scale_name = match.group(1)
            intervals_str = match.group(2)
            
            # Parse intervals
            intervals = []
            for interval_str in intervals_str.split(','):
                interval_str = interval_str.strip()
                if interval_str:
                    try:
                        intervals.append(int(interval_str))
                    except ValueError:
                        self.logger.warning(f"Invalid interval '{interval_str}' in scale '{scale_name}'")
                        continue
            
            if intervals:
                scales[scale_name] = intervals
                self.logger.debug(f"Parsed scale '{scale_name}': {intervals}")
        
        return scales
    
    def _extract_citations_object(self, js_content: str) -> Dict[str, ScaleCitation]:
        """
        Extract the scaleCitations object from JavaScript content.
        
        Args:
            js_content: JavaScript file content
            
        Returns:
            Dictionary mapping scale names to citation information
        """
        citations = {}
        
        # Find the scaleCitations object definition
        citations_pattern = r'this\.scaleCitations\s*=\s*\{(.*?)\};'
        match = re.search(citations_pattern, js_content, re.DOTALL)
        
        if not match:
            self.logger.warning("Could not find scaleCitations object in JavaScript file")
            return citations
        
        citations_content = match.group(1)
        
        # This is a simplified parser for the citations object
        # In a production system, you might want to use a proper JavaScript parser
        try:
            # Extract individual scale citation blocks - use a simpler approach
            # Split by scale names and parse each block
            lines = citations_content.split('\n')
            current_scale = None
            current_block = []
            brace_count = 0
            
            for line in lines:
                line = line.strip()
                if not line or line.startswith('//'):
                    continue
                
                # Check if this line starts a new scale definition
                scale_match = re.match(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{', line)
                if scale_match and brace_count == 0:
                    # Process previous scale if exists
                    if current_scale and current_block:
                        try:
                            citation = self._parse_citation_block('\n'.join(current_block))
                            citations[current_scale] = citation
                            self.logger.debug(f"Parsed citation for scale '{current_scale}'")
                        except Exception as e:
                            self.logger.warning(f"Failed to parse citation for scale '{current_scale}': {e}")
                    
                    # Start new scale
                    current_scale = scale_match.group(1)
                    current_block = [line]
                    brace_count = line.count('{') - line.count('}')
                else:
                    # Continue current block
                    if current_scale:
                        current_block.append(line)
                        brace_count += line.count('{') - line.count('}')
                        
                        # If braces are balanced, we've finished this scale
                        if brace_count == 0:
                            try:
                                citation = self._parse_citation_block('\n'.join(current_block))
                                citations[current_scale] = citation
                                self.logger.debug(f"Parsed citation for scale '{current_scale}'")
                            except Exception as e:
                                self.logger.warning(f"Failed to parse citation for scale '{current_scale}': {e}")
                            
                            current_scale = None
                            current_block = []
            
            # Process last scale if exists
            if current_scale and current_block:
                try:
                    citation = self._parse_citation_block('\n'.join(current_block))
                    citations[current_scale] = citation
                    self.logger.debug(f"Parsed citation for scale '{current_scale}'")
                except Exception as e:
                    self.logger.warning(f"Failed to parse citation for scale '{current_scale}': {e}")
        
        except Exception as e:
            self.logger.warning(f"Failed to parse citations object: {e}")
        
        return citations
    
    def _parse_citation_block(self, citation_content: str) -> ScaleCitation:
        """
        Parse a single citation block.
        
        Args:
            citation_content: Content of a citation block
            
        Returns:
            ScaleCitation object
        """
        # Extract description
        description = ""
        desc_match = re.search(r'description\s*:\s*["\']([^"\']*)["\']', citation_content)
        if desc_match:
            description = desc_match.group(1)
        
        # Extract cultural context
        cultural_context = {}
        context_match = re.search(r'culturalContext\s*:\s*\{([^}]*)\}', citation_content, re.DOTALL)
        if context_match:
            context_content = context_match.group(1)
            
            # Parse individual context fields
            context_fields = ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction']
            for field in context_fields:
                field_match = re.search(f'{field}\\s*:\\s*["\']([^"\']*)["\']', context_content)
                if field_match:
                    cultural_context[field] = field_match.group(1)
        
        # Extract references (simplified)
        references = []
        refs_match = re.search(r'references\s*:\s*\[(.*?)\]', citation_content, re.DOTALL)
        if refs_match:
            refs_content = refs_match.group(1)
            
            # This is a very simplified reference parser
            # In practice, you'd want a more robust JSON-like parser
            ref_blocks = re.findall(r'\{([^}]*)\}', refs_content)
            for ref_block in ref_blocks:
                ref_data = {}
                
                # Extract common reference fields
                ref_fields = ['type', 'title', 'url', 'description', 'source', 'category']
                for field in ref_fields:
                    field_match = re.search(f'"{field}"\\s*:\\s*"([^"]*)"', ref_block)
                    if field_match:
                        ref_data[field] = field_match.group(1)
                
                if ref_data:
                    references.append(ref_data)
        
        return ScaleCitation(
            description=description,
            cultural_context=cultural_context,
            references=references
        )
    
    def _convert_to_scale_data(self, scales_dict: Dict[str, List[int]], 
                             citations_dict: Dict[str, ScaleCitation]) -> List[ScaleData]:
        """
        Convert parsed scales and citations to ScaleData objects.
        
        Args:
            scales_dict: Dictionary of scale names to intervals
            citations_dict: Dictionary of scale names to citations
            
        Returns:
            List of ScaleData objects
        """
        scale_data_list = []
        
        for scale_name, intervals in scales_dict.items():
            # Get citation information if available
            citation = citations_dict.get(scale_name)
            
            # Generate notes from intervals
            notes = self._intervals_to_notes(intervals)
            
            # Determine scale type
            scale_type = self._determine_scale_type(scale_name, citation)
            
            # Extract cultural origin
            cultural_origin = ""
            if citation and citation.cultural_context:
                cultural_origin = citation.cultural_context.get('region', '')
            
            # Extract description
            description = ""
            if citation:
                description = citation.description
            
            # Create metadata
            metadata = {}
            if citation:
                metadata['cultural_context'] = citation.cultural_context
                metadata['references'] = citation.references
            
            # Create ScaleData object
            scale_data = ScaleData(
                scale_id=self._generate_scale_id(scale_name),
                name=scale_name,
                notes=notes,
                intervals=intervals,
                scale_type=scale_type,
                cultural_origin=cultural_origin,
                description=description,
                metadata=metadata
            )
            
            scale_data_list.append(scale_data)
        
        return scale_data_list
    
    def _intervals_to_notes(self, intervals: List[int], root_note: str = 'C') -> List[str]:
        """
        Convert intervals to note names starting from a root note.
        
        Args:
            intervals: List of semitone intervals
            root_note: Root note to start from (default: 'C')
            
        Returns:
            List of note names
        """
        if root_note not in self.chromatic_notes:
            root_note = 'C'
        
        root_index = self.chromatic_notes.index(root_note)
        notes = []
        
        for interval in intervals:
            note_index = (root_index + interval) % 12
            notes.append(self.chromatic_notes[note_index])
        
        return notes
    
    def _determine_scale_type(self, scale_name: str, citation: Optional[ScaleCitation]) -> ScaleType:
        """
        Determine the scale type based on name and citation information.
        
        Args:
            scale_name: Name of the scale
            citation: Citation information if available
            
        Returns:
            ScaleType enum value
        """
        name_lower = scale_name.lower()
        
        # Check cultural context first if available
        if citation and citation.cultural_context:
            region = citation.cultural_context.get('region', '').lower()
            cultural_group = citation.cultural_context.get('culturalGroup', '').lower()
            
            # Cultural scales
            if any(term in region for term in ['africa', 'india', 'middle east', 'south america']):
                return ScaleType.CULTURAL
            if any(term in cultural_group for term in ['raga', 'maqam', 'traditional']):
                return ScaleType.CULTURAL
        
        # Modern/Jazz scales (check before traditional to catch bebop_major correctly)
        if any(term in name_lower for term in ['jazz', 'blues', 'bebop', 'altered', 'barry_', 'whole_tone', 'octatonic']):
            return ScaleType.MODERN
        
        # Cultural scales based on name patterns
        if any(term in name_lower for term in ['raga_', 'maqam_', 'pentatonic', 'african', 'indian', 'chinese', 'japanese']):
            return ScaleType.CULTURAL
        
        # Traditional Western scales
        if any(term in name_lower for term in ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']):
            return ScaleType.TRADITIONAL
        
        # Default to modern for unknown scales
        return ScaleType.MODERN
    
    def _generate_scale_id(self, scale_name: str) -> str:
        """
        Generate a unique scale ID from the scale name.
        
        Args:
            scale_name: Original scale name
            
        Returns:
            Unique scale ID
        """
        # Convert to lowercase and replace non-alphanumeric characters with underscores
        scale_id = re.sub(r'[^a-zA-Z0-9_]', '_', scale_name.lower())
        scale_id = re.sub(r'_+', '_', scale_id).strip('_')
        return scale_id or "unknown_scale"


class JavaScriptDatabaseReader:
    """
    Main interface for reading JavaScript scale databases.
    
    This class provides a high-level interface for parsing JavaScript scale
    definitions and converting them to Python data structures.
    """
    
    def __init__(self, database_file_path: str):
        """
        Initialize the database reader.
        
        Args:
            database_file_path: Path to the JavaScript database file
        """
        self.database_file_path = database_file_path
        self.parser = JavaScriptScaleParser()
        self.logger = logging.getLogger(f"{__name__}.JavaScriptDatabaseReader")
    
    def read_all_scales(self) -> List[ScaleData]:
        """
        Read all scales from the JavaScript database.
        
        Returns:
            List of ScaleData objects
            
        Raises:
            DatabaseError: If reading fails
        """
        try:
            scales = self.parser.parse_scales_from_file(self.database_file_path)
            self.logger.info(f"Successfully read {len(scales)} scales from database")
            return scales
        except Exception as e:
            self.logger.error(f"Failed to read scales from database: {e}")
            raise DatabaseError(f"Failed to read JavaScript database: {e}")
    
    def read_scales_by_type(self, scale_type: ScaleType) -> List[ScaleData]:
        """
        Read scales of a specific type from the database.
        
        Args:
            scale_type: Type of scales to read
            
        Returns:
            List of ScaleData objects of the specified type
        """
        all_scales = self.read_all_scales()
        filtered_scales = [scale for scale in all_scales if scale.scale_type == scale_type]
        
        self.logger.info(f"Found {len(filtered_scales)} scales of type {scale_type.value}")
        return filtered_scales
    
    def read_scales_by_cultural_origin(self, cultural_origin: str) -> List[ScaleData]:
        """
        Read scales from a specific cultural origin.
        
        Args:
            cultural_origin: Cultural origin to filter by
            
        Returns:
            List of ScaleData objects from the specified cultural origin
        """
        all_scales = self.read_all_scales()
        filtered_scales = [
            scale for scale in all_scales 
            if cultural_origin.lower() in scale.cultural_origin.lower()
        ]
        
        self.logger.info(f"Found {len(filtered_scales)} scales from {cultural_origin}")
        return filtered_scales
    
    def get_scale_by_name(self, scale_name: str) -> Optional[ScaleData]:
        """
        Get a specific scale by name.
        
        Args:
            scale_name: Name of the scale to find
            
        Returns:
            ScaleData object if found, None otherwise
        """
        all_scales = self.read_all_scales()
        
        for scale in all_scales:
            if scale.name == scale_name:
                return scale
        
        self.logger.warning(f"Scale '{scale_name}' not found in database")
        return None
    
    def get_database_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the database content.
        
        Returns:
            Dictionary containing database statistics
        """
        try:
            all_scales = self.read_all_scales()
            
            # Count by type
            type_counts = {}
            for scale_type in ScaleType:
                count = len([s for s in all_scales if s.scale_type == scale_type])
                type_counts[scale_type.value] = count
            
            # Count by cultural origin
            origin_counts = {}
            for scale in all_scales:
                origin = scale.cultural_origin or "Unknown"
                origin_counts[origin] = origin_counts.get(origin, 0) + 1
            
            # Count scales with/without citations
            scales_with_citations = len([s for s in all_scales if 'references' in s.metadata])
            scales_without_citations = len(all_scales) - scales_with_citations
            
            statistics = {
                'total_scales': len(all_scales),
                'scales_by_type': type_counts,
                'scales_by_origin': origin_counts,
                'scales_with_citations': scales_with_citations,
                'scales_without_citations': scales_without_citations,
                'database_file': self.database_file_path
            }
            
            self.logger.info(f"Generated statistics for {len(all_scales)} scales")
            return statistics
        
        except Exception as e:
            self.logger.error(f"Failed to generate database statistics: {e}")
            return {'error': str(e)}