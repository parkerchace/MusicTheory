#!/usr/bin/env python3
"""
Import Tool for Scale Citation Integration

This module provides functionality to import validated scale sources from the 
web scraper validation report into the music theory app's scaleCitations database.
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime


class ValidationImporter:
    """
    Imports validated scale sources from validation report into scaleCitations.
    
    This class handles the process of reading validation results, extracting
    KEEP and REVIEW status scales, and updating the music-theory-engine.js
    scaleCitations object with verified references.
    """
    
    def __init__(self, validation_json_path: str, js_file_path: str) -> None:
        """
        Initialize the ValidationImporter.
        
        Args:
            validation_json_path: Path to the scale_validation_results.json file
            js_file_path: Path to the music-theory-engine.js file to update
            
        Raises:
            FileNotFoundError: If either file path does not exist
        """
        self.validation_json_path = validation_json_path
        self.js_file_path = js_file_path
        
        # Validate file paths exist
        if not os.path.exists(validation_json_path):
            raise FileNotFoundError(f"Validation JSON file not found: {validation_json_path}")
        if not os.path.exists(js_file_path):
            raise FileNotFoundError(f"JavaScript file not found: {js_file_path}")
    
    def load_validation_results(self) -> Dict[str, Any]:
        """
        Load and parse the validation JSON file.
        
        Returns:
            Dictionary containing the parsed validation results
            
        Raises:
            json.JSONDecodeError: If the JSON file is malformed
            IOError: If the file cannot be read
        """
        try:
            with open(self.validation_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate that required fields exist
            if 'results' not in data:
                raise ValueError("Validation JSON must contain 'results' field")
            
            return data
            
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Malformed JSON in {self.validation_json_path}: {e.msg}", e.doc, e.pos)
        except IOError as e:
            raise IOError(f"Cannot read validation file {self.validation_json_path}: {e}")
    
    def extract_keep_scales(self) -> List[Dict[str, Any]]:
        """
        Extract all scales with KEEP recommendation status.
        
        Returns:
            List of scale dictionaries that have KEEP recommendation
            
        Note:
            Only scales with 2+ verified sources should have KEEP status
        """
        validation_data = self.load_validation_results()
        keep_scales = []
        
        for result in validation_data.get('results', []):
            # Handle missing fields gracefully
            recommendation = result.get('recommendation', '').upper()
            if recommendation == 'KEEP':
                # Ensure required fields exist with defaults
                scale_data = {
                    'scale_name': result.get('scale_name', ''),
                    'display_name': result.get('display_name', result.get('scale_name', '')),
                    'intervals': result.get('intervals', []),
                    'quality_score': result.get('quality_score', 0.0),
                    'recommendation': recommendation,
                    'reason': result.get('reason', ''),
                    'sources': result.get('sources', [])
                }
                keep_scales.append(scale_data)
        
        return keep_scales
    
    def extract_review_scales(self) -> List[Dict[str, Any]]:
        """
        Extract all scales with REVIEW recommendation status.
        
        Returns:
            List of scale dictionaries that have REVIEW recommendation
            
        Note:
            These scales have limited documentation (0-1 sources) and need manual review
        """
        validation_data = self.load_validation_results()
        review_scales = []
        
        for result in validation_data.get('results', []):
            # Handle missing fields gracefully
            recommendation = result.get('recommendation', '').upper()
            if recommendation == 'REVIEW':
                # Ensure required fields exist with defaults
                scale_data = {
                    'scale_name': result.get('scale_name', ''),
                    'display_name': result.get('display_name', result.get('scale_name', '')),
                    'intervals': result.get('intervals', []),
                    'quality_score': result.get('quality_score', 0.0),
                    'recommendation': recommendation,
                    'reason': result.get('reason', ''),
                    'sources': result.get('sources', [])
                }
                review_scales.append(scale_data)
        
        return review_scales
    
    def map_to_citation_format(self, scale_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert validation result to scaleCitations format.
        
        Args:
            scale_result: Scale validation result from JSON
            
        Returns:
            Dictionary in scaleCitations format with references, validationStatus, etc.
            
        Note:
            Sources with quality >= 0.7 are marked as "verified" category
        """
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Map recommendation to validation status
        recommendation = scale_result.get('recommendation', '').upper()
        if recommendation == 'KEEP':
            validation_status = 'verified'
        elif recommendation == 'REVIEW':
            validation_status = 'needs-review'
        else:
            validation_status = 'limited-documentation'
        
        # Convert sources to references format
        references = []
        sources = scale_result.get('sources', [])
        
        for source in sources:
            quality = source.get('quality', 0.0)
            
            # Set category based on quality threshold (0.7)
            category = 'verified' if quality >= 0.7 else 'unverified'
            
            reference = {
                'type': 'verified_source',
                'title': source.get('title', ''),
                'url': source.get('url', ''),
                'description': source.get('snippet', ''),
                'source': 'Web Validation',
                'category': category,
                'verificationStatus': f"VERIFIED via Web Search - Score: {quality:.2f}",
                'verificationDate': current_date,
                'contentScore': quality
            }
            references.append(reference)
        
        # Sort references by contentScore descending (highest quality first)
        references.sort(key=lambda x: x['contentScore'], reverse=True)
        
        return {
            'references': references,
            'validationStatus': validation_status,
            'validationDate': current_date
        }
    
    def update_scale_citations(self, updates: List[Dict[str, Any]]) -> int:
        """
        Update scaleCitations in JS file while preserving existing data.
        
        Args:
            updates: List of citation updates to apply
            
        Returns:
            Number of scales that were updated
            
        Note:
            Preserves existing description and culturalContext fields
        """
        import re
        
        # Read the JS file
        try:
            with open(self.js_file_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
        except IOError as e:
            raise IOError(f"Cannot read JS file {self.js_file_path}: {e}")
        
        # Create backup
        backup_path = f"{self.js_file_path}.backup"
        try:
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(js_content)
        except IOError as e:
            raise IOError(f"Cannot create backup file {backup_path}: {e}")
        
        # Find the scaleCitations object
        scale_citations_pattern = r'(this\.scaleCitations\s*=\s*\{)(.*?)(\n\s*\};)'
        match = re.search(scale_citations_pattern, js_content, re.DOTALL)
        
        if not match:
            raise ValueError("Could not find scaleCitations object in JS file")
        
        prefix = match.group(1)
        citations_content = match.group(2)
        suffix = match.group(3)
        
        # Parse existing citations to preserve description/culturalContext
        existing_citations = self._parse_existing_citations(citations_content)
        
        # Apply updates
        updated_count = 0
        for update in updates:
            scale_name = update.get('scale_name', '')
            if not scale_name:
                continue
                
            citation_data = update.get('citation_data', {})
            
            # Merge with existing data
            if scale_name in existing_citations:
                # Preserve existing description and culturalContext
                merged_citation = existing_citations[scale_name].copy()
                
                # Update references and validation fields
                if 'references' in citation_data:
                    merged_citation['references'] = citation_data['references']
                if 'validationStatus' in citation_data:
                    merged_citation['validationStatus'] = citation_data['validationStatus']
                if 'validationDate' in citation_data:
                    merged_citation['validationDate'] = citation_data['validationDate']
                    
                existing_citations[scale_name] = merged_citation
            else:
                # Create new entry
                existing_citations[scale_name] = citation_data
                
            updated_count += 1
        
        # Rebuild the citations content
        new_citations_content = self._build_citations_content(existing_citations)
        
        # Replace in JS content
        new_js_content = js_content.replace(
            match.group(0),
            prefix + new_citations_content + suffix
        )
        
        # Write updated file
        try:
            with open(self.js_file_path, 'w', encoding='utf-8') as f:
                f.write(new_js_content)
        except IOError as e:
            raise IOError(f"Cannot write updated JS file {self.js_file_path}: {e}")
        
        return updated_count
    
    def _parse_existing_citations(self, citations_content: str) -> Dict[str, Dict[str, Any]]:
        """
        Parse existing scaleCitations content to extract scale data.
        
        Args:
            citations_content: The content inside the scaleCitations object
            
        Returns:
            Dictionary mapping scale names to their citation data
        """
        import re
        
        citations = {}
        
        # Find scale entries using regex
        # Pattern matches: scale_name: { ... }
        scale_pattern = r'(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
        
        for match in re.finditer(scale_pattern, citations_content):
            scale_name = match.group(1)
            scale_content = match.group(2)
            
            # Parse the scale content
            citation_data = {}
            
            # Extract description
            desc_match = re.search(r"description:\s*['\"]([^'\"]*)['\"]", scale_content)
            if desc_match:
                citation_data['description'] = desc_match.group(1)
            
            # Extract culturalContext (simplified parsing)
            cultural_match = re.search(r'culturalContext:\s*\{([^{}]*)\}', scale_content)
            if cultural_match:
                cultural_content = cultural_match.group(1)
                cultural_context = {}
                
                # Extract cultural context fields
                for field in ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction']:
                    field_match = re.search(f'{field}:\\s*["\']([^"\']*)["\']', cultural_content)
                    if field_match:
                        cultural_context[field] = field_match.group(1)
                
                if cultural_context:
                    citation_data['culturalContext'] = cultural_context
            
            # Extract references (simplified - will be replaced by updates)
            ref_match = re.search(r'references:\s*\[([^\]]*)\]', scale_content, re.DOTALL)
            if ref_match:
                citation_data['references'] = []  # Will be populated by updates
            
            # Extract validation fields if they exist
            val_status_match = re.search(r"validationStatus:\s*['\"]([^'\"]*)['\"]", scale_content)
            if val_status_match:
                citation_data['validationStatus'] = val_status_match.group(1)
                
            val_date_match = re.search(r"validationDate:\s*['\"]([^'\"]*)['\"]", scale_content)
            if val_date_match:
                citation_data['validationDate'] = val_date_match.group(1)
            
            citations[scale_name] = citation_data
        
        return citations
    
    def _build_citations_content(self, citations: Dict[str, Dict[str, Any]]) -> str:
        """
        Build the scaleCitations content from citation data.
        
        Args:
            citations: Dictionary mapping scale names to citation data
            
        Returns:
            String content for the scaleCitations object
        """
        lines = []
        
        for scale_name, citation_data in citations.items():
            lines.append(f"            {scale_name}: {{")
            
            # Add description
            if 'description' in citation_data:
                desc = citation_data['description'].replace('"', '\\"')
                lines.append(f'                description: "{desc}",')
            
            # Add culturalContext
            if 'culturalContext' in citation_data:
                ctx = citation_data['culturalContext']
                lines.append("                culturalContext: {")
                for field, value in ctx.items():
                    escaped_value = str(value).replace('"', '\\"')
                    lines.append(f'                    {field}: "{escaped_value}",')
                lines.append("                },")
            
            # Add references
            if 'references' in citation_data and citation_data['references']:
                lines.append("                references: [")
                for ref in citation_data['references']:
                    lines.append("                    {")
                    for key, value in ref.items():
                        if isinstance(value, str):
                            escaped_value = value.replace('"', '\\"')
                            lines.append(f'                        "{key}": "{escaped_value}",')
                        else:
                            lines.append(f'                        "{key}": {json.dumps(value)},')
                    lines.append("                    },")
                lines.append("                ],")
            
            # Add validation fields
            if 'validationStatus' in citation_data:
                status = citation_data['validationStatus']
                lines.append(f'                validationStatus: "{status}",')
            
            if 'validationDate' in citation_data:
                date = citation_data['validationDate']
                lines.append(f'                validationDate: "{date}",')
            
            lines.append("            },")
        
        return "\n" + "\n".join(lines) + "\n        "
    
    def generate_summary(self) -> str:
        """
        Generate import summary report.
        
        Returns:
            String summary showing how many scales were updated, references added, etc.
        """
        try:
            # Load validation results to get counts
            validation_data = self.load_validation_results()
            results = validation_data.get('results', [])
            
            # Count scales by recommendation
            keep_count = sum(1 for r in results if r.get('recommendation', '').upper() == 'KEEP')
            review_count = sum(1 for r in results if r.get('recommendation', '').upper() == 'REVIEW')
            remove_count = sum(1 for r in results if r.get('recommendation', '').upper() == 'REMOVE')
            
            # Count total references from KEEP scales
            total_references = 0
            high_quality_refs = 0
            
            for result in results:
                if result.get('recommendation', '').upper() == 'KEEP':
                    sources = result.get('sources', [])
                    total_references += len(sources)
                    high_quality_refs += sum(1 for s in sources if s.get('quality', 0.0) >= 0.7)
            
            # Generate summary report
            summary_lines = [
                "=" * 60,
                "SCALE CITATION INTEGRATION SUMMARY",
                "=" * 60,
                f"Validation Date: {validation_data.get('validation_date', 'Unknown')}",
                f"Total Scales Processed: {len(results)}",
                "",
                "SCALE CATEGORIZATION:",
                f"  • KEEP (well-documented): {keep_count} scales",
                f"  • REVIEW (limited docs): {review_count} scales", 
                f"  • REMOVE (insufficient): {remove_count} scales",
                "",
                "REFERENCE STATISTICS:",
                f"  • Total references imported: {total_references}",
                f"  • High-quality references (≥0.7): {high_quality_refs}",
                f"  • Average references per KEEP scale: {total_references/keep_count if keep_count > 0 else 0:.1f}",
                "",
                "VALIDATION STATUS MAPPING:",
                f"  • {keep_count} scales set to 'verified' status",
                f"  • {review_count} scales set to 'needs-review' status",
                "",
                "NEXT STEPS:",
                f"  • {keep_count} scales ready for UI display",
                f"  • {review_count} scales need manual review via batch tool",
                "=" * 60
            ]
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            return f"Error generating summary: {e}"


if __name__ == "__main__":
    # CLI interface for running the import
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python import_validation_results.py <validation_json> <js_file>")
        sys.exit(1)
    
    validation_json = sys.argv[1]
    js_file = sys.argv[2]
    
    try:
        print("Starting Scale Citation Integration Import...")
        print("=" * 60)
        
        importer = ValidationImporter(validation_json, js_file)
        print(f"✓ ValidationImporter initialized successfully")
        print(f"  Validation JSON: {validation_json}")
        print(f"  JS File: {js_file}")
        print()
        
        # Extract KEEP scales for import
        print("Extracting KEEP scales...")
        keep_scales = importer.extract_keep_scales()
        print(f"✓ Found {len(keep_scales)} KEEP scales to import")
        
        # Extract REVIEW scales for status update
        print("Extracting REVIEW scales...")
        review_scales = importer.extract_review_scales()
        print(f"✓ Found {len(review_scales)} REVIEW scales to update status")
        print()
        
        # Prepare updates for all scales
        updates = []
        
        # Process KEEP scales
        print("Processing KEEP scales...")
        for scale in keep_scales:
            citation_data = importer.map_to_citation_format(scale)
            updates.append({
                'scale_name': scale['scale_name'],
                'citation_data': citation_data
            })
        print(f"✓ Prepared {len(keep_scales)} KEEP scale updates")
        
        # Process REVIEW scales (just status update, no references)
        print("Processing REVIEW scales...")
        for scale in review_scales:
            citation_data = importer.map_to_citation_format(scale)
            updates.append({
                'scale_name': scale['scale_name'],
                'citation_data': citation_data
            })
        print(f"✓ Prepared {len(review_scales)} REVIEW scale status updates")
        print()
        
        # Apply all updates
        print("Updating scaleCitations in music-theory-engine.js...")
        updated_count = importer.update_scale_citations(updates)
        print(f"✓ Successfully updated {updated_count} scales")
        print()
        
        # Generate and display summary
        print("Generating summary report...")
        summary = importer.generate_summary()
        print(summary)
        
        print("\n✓ Import completed successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)