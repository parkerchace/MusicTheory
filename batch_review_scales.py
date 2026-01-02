#!/usr/bin/env python3
"""
Batch Review Tool for Scale Citation Integration

This module provides functionality to review REVIEW-status scales in batches of 10
with automatic link finding, allowing efficient verification of scales with limited
documentation.
"""

import json
import os
import re
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
from ddgs import DDGS


class BatchReviewTool:
    """
    Reviews REVIEW-status scales in batches with automatic source finding.
    
    This class handles the process of selecting unreviewed REVIEW scales,
    automatically searching for sources, presenting them for user approval,
    and updating the scaleCitations with approved sources.
    """
    
    def __init__(self, validation_json_path: str, js_file_path: str) -> None:
        """
        Initialize the BatchReviewTool.
        
        Args:
            validation_json_path: Path to the scale_validation_results.json file
            js_file_path: Path to the music-theory-engine.js file to update
            
        Raises:
            FileNotFoundError: If either file path does not exist
        """
        self.validation_json_path = validation_json_path
        self.js_file_path = js_file_path
        self.progress_file_path = "review_progress.json"
        
        # Validate file paths exist
        if not os.path.exists(validation_json_path):
            raise FileNotFoundError(f"Validation JSON file not found: {validation_json_path}")
        if not os.path.exists(js_file_path):
            raise FileNotFoundError(f"JavaScript file not found: {js_file_path}")
    
    def get_review_progress(self) -> Dict[str, Any]:
        """
        Load progress from review_progress.json.
        
        Returns:
            Dictionary containing review progress data, or empty progress if file doesn't exist
            
        Note:
            Creates a new progress file with default structure if none exists
        """
        if not os.path.exists(self.progress_file_path):
            # Create default progress structure
            default_progress = {
                "lastUpdated": datetime.now().isoformat(),
                "totalReviewScales": 0,
                "reviewedScales": [],
                "remainingScales": [],
                "approvedSources": {},
                "rejectedScales": []
            }
            self.save_progress(default_progress)
            return default_progress
        
        try:
            with open(self.progress_file_path, 'r', encoding='utf-8') as f:
                progress = json.load(f)
            return progress
        except (json.JSONDecodeError, IOError) as e:
            # If file is corrupted, create new default progress
            print(f"Warning: Could not load progress file ({e}), creating new one")
            default_progress = {
                "lastUpdated": datetime.now().isoformat(),
                "totalReviewScales": 0,
                "reviewedScales": [],
                "remainingScales": [],
                "approvedSources": {},
                "rejectedScales": []
            }
            self.save_progress(default_progress)
            return default_progress
    
    def get_next_batch(self, batch_size: int = 10) -> List[Dict[str, Any]]:
        """
        Get next N unreviewed REVIEW-status scales.
        
        Args:
            batch_size: Number of scales to return (default 10)
            
        Returns:
            List of scale dictionaries for the next batch to review
            
        Note:
            Loads progress, filters unreviewed REVIEW scales, returns next batch
        """
        # Load validation results
        try:
            with open(self.validation_json_path, 'r', encoding='utf-8') as f:
                validation_data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            raise IOError(f"Cannot load validation results: {e}")
        
        # Get all REVIEW-status scales
        all_review_scales = []
        for result in validation_data.get('results', []):
            if result.get('recommendation', '').upper() == 'REVIEW':
                all_review_scales.append(result)
        
        # Load progress to see which scales have been reviewed
        progress = self.get_review_progress()
        reviewed_scale_names = set(progress.get('reviewedScales', []))
        
        # Filter out already reviewed scales
        unreviewed_scales = []
        for scale in all_review_scales:
            scale_name = scale.get('scale_name', '')
            if scale_name not in reviewed_scale_names:
                unreviewed_scales.append(scale)
        
        # Return the next batch (up to batch_size scales)
        return unreviewed_scales[:batch_size]
    
    def search_scale(self, scale_name: str) -> List[Dict[str, Any]]:
        """
        Search for a scale using web scraper logic and return found sources.
        
        Args:
            scale_name: Name of the scale to search for
            
        Returns:
            List of found sources with title, url, snippet, and quality
            
        Note:
            Reuses web scraper logic from scale_web_scraper.py
        """
        # Convert scale name to display format
        display_name = scale_name.replace('_', ' ').title()
        
        # Search queries similar to scale_web_scraper.py
        queries = [
            f'"{display_name} scale" music theory intervals',
            f'{display_name} musical scale notes',
        ]
        
        all_results = []
        ddgs = DDGS()
        
        for query in queries:
            try:
                results = list(ddgs.text(query, max_results=5))
                all_results.extend(results)
                time.sleep(2)  # Rate limiting
            except Exception as e:
                print(f"      Search error for '{query}': {e}")
                time.sleep(3)  # Extra delay on error
                continue
        
        # Remove duplicates based on URL
        seen = set()
        unique_results = []
        for r in all_results:
            url = r.get('href', '').lower()
            if url and url not in seen:
                seen.add(url)
                unique_results.append(r)
        
        # Convert to source format and evaluate quality
        sources = []
        music_keywords = ['scale', 'mode', 'interval', 'note', 'degree', 'semitone', 
                          'music theory', 'chord', 'harmony', 'melody', 'key', 'pitch',
                          'octave', 'tonic', 'dominant']
        
        scale_lower = scale_name.lower().replace('_', ' ')
        display_lower = display_name.lower()
        
        for result in unique_results:
            title = result.get('title', '').lower()
            body = result.get('body', '').lower()
            url = result.get('href', '').lower()
            content = f"{title} {body}"
            
            # Check if this is a relevant music source
            has_scale_word = 'scale' in content or 'mode' in content
            has_name = scale_lower in content or display_lower in content
            music_count = sum(1 for kw in music_keywords if kw in content)
            
            if music_count >= 2:  # Must have at least 2 music keywords
                # Determine quality based on source and content
                quality = 0.5  # Default quality
                if '.edu' in url or 'wikipedia' in url:
                    quality = 0.9
                elif 'musictheory' in url or 'jazz' in url:
                    quality = 0.7
                elif has_scale_word and has_name:
                    quality = 0.6
                
                sources.append({
                    'title': result.get('title', '')[:80],
                    'url': result.get('href', ''),
                    'snippet': result.get('body', '')[:150],
                    'quality': quality
                })
        
        # Sort by quality (highest first) and return top 3
        sources.sort(key=lambda x: x['quality'], reverse=True)
        return sources[:3]

    def present_for_review(self, scale: Dict[str, Any], sources: List[Dict[str, Any]]) -> str:
        """
        Display scale name, current info, and found sources for user review.
        
        Args:
            scale: Scale dictionary with name, intervals, etc.
            sources: List of found sources to present
            
        Returns:
            User decision: 'approve', 'reject', or 'skip'
            
        Note:
            Prompts user for approval/rejection of each source
        """
        scale_name = scale.get('scale_name', 'Unknown')
        display_name = scale.get('display_name', scale_name)
        intervals = scale.get('intervals', [])
        quality_score = scale.get('quality_score', 0.0)
        reason = scale.get('reason', 'No reason provided')
        
        print(f"\n{'='*60}")
        print(f"🎵 REVIEWING: {display_name} ({scale_name})")
        print(f"{'='*60}")
        print(f"Intervals: {intervals}")
        print(f"Current Quality Score: {quality_score:.2f}")
        print(f"Current Status: {reason}")
        
        if not sources:
            print("\n❌ No sources found for this scale.")
            print("\nOptions:")
            print("  r) Reject - mark as 'limited-documentation'")
            print("  s) Skip - leave for later review")
            
            while True:
                choice = input("\nYour choice (r/s): ").lower().strip()
                if choice == 'r':
                    return 'reject'
                elif choice == 's':
                    return 'skip'
                else:
                    print("Invalid choice. Please enter 'r' for reject or 's' for skip.")
        
        print(f"\n📚 Found {len(sources)} potential sources:")
        print("-" * 60)
        
        for i, source in enumerate(sources, 1):
            title = source.get('title', 'No title')
            url = source.get('url', 'No URL')
            snippet = source.get('snippet', 'No snippet')
            quality = source.get('quality', 0.0)
            
            print(f"\n{i}. {title}")
            print(f"   URL: {url}")
            print(f"   Quality: {quality:.2f}")
            print(f"   Preview: {snippet}...")
        
        print(f"\n{'-'*60}")
        print("Options:")
        print("  a) Approve - add best source and mark as 'manually-verified'")
        print("  r) Reject all - mark as 'limited-documentation'")
        print("  s) Skip - leave for later review")
        
        while True:
            choice = input("\nYour choice (a/r/s): ").lower().strip()
            if choice == 'a':
                return 'approve'
            elif choice == 'r':
                return 'reject'
            elif choice == 's':
                return 'skip'
            else:
                print("Invalid choice. Please enter 'a' for approve, 'r' for reject, or 's' for skip.")

    def approve_source(self, scale_name: str, source: Dict[str, Any]) -> None:
        """
        Add approved source to scaleCitations references and update validation status.
        
        Args:
            scale_name: Name of the scale to update
            source: Source dictionary to add to references
            
        Note:
            Updates validationStatus to "manually-verified"
        """
        try:
            # Read the JavaScript file
            with open(self.js_file_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
            
            # Find the scaleCitations object
            citations_match = re.search(r'this\.scaleCitations\s*=\s*\{(.*?)\};', js_content, re.DOTALL)
            if not citations_match:
                raise ValueError("Could not find scaleCitations object in JavaScript file")
            
            citations_content = citations_match.group(1)
            
            # Parse existing citations (simplified parsing)
            import ast
            
            # Convert JavaScript object to Python dict format for parsing
            # This is a simplified approach - in production, you'd want a proper JS parser
            citations_dict = {}
            
            # Look for existing entry for this scale
            scale_pattern = rf'{re.escape(scale_name)}\s*:\s*\{{([^}}]*(?:\{{[^}}]*\}}[^}}]*)*)\}}'
            scale_match = re.search(scale_pattern, citations_content, re.DOTALL)
            
            # Create new reference object
            new_reference = {
                "type": "verified_source",
                "title": source.get('title', ''),
                "url": source.get('url', ''),
                "description": source.get('snippet', ''),
                "source": "Manual Review",
                "category": "verified" if source.get('quality', 0) >= 0.7 else "unverified",
                "verificationStatus": f"MANUALLY VERIFIED - Quality: {source.get('quality', 0):.2f}",
                "verificationDate": datetime.now().strftime('%Y-%m-%d'),
                "contentScore": source.get('quality', 0)
            }
            
            current_date = datetime.now().strftime('%Y-%m-%d')
            
            if scale_match:
                # Update existing entry
                existing_content = scale_match.group(1)
                
                # Check if references array exists
                if 'references:' in existing_content:
                    # Add to existing references array
                    # This is a simplified approach - would need proper JS parsing for production
                    references_pattern = r'references:\s*\[(.*?)\]'
                    references_match = re.search(references_pattern, existing_content, re.DOTALL)
                    
                    if references_match:
                        existing_refs = references_match.group(1).strip()
                        if existing_refs:
                            new_refs_content = f"{existing_refs},\n      {json.dumps(new_reference, indent=6)[6:]}"
                        else:
                            new_refs_content = f"\n      {json.dumps(new_reference, indent=6)[6:]}\n    "
                    else:
                        new_refs_content = f"\n      {json.dumps(new_reference, indent=6)[6:]}\n    "
                    
                    # Update the references array
                    updated_content = re.sub(
                        r'references:\s*\[(.*?)\]',
                        f'references: [{new_refs_content}]',
                        existing_content,
                        flags=re.DOTALL
                    )
                else:
                    # Add references array to existing entry
                    updated_content = existing_content.rstrip() + f',\n    references: [\n      {json.dumps(new_reference, indent=6)[6:]}\n    ]'
                
                # Update validation status and date
                if 'validationStatus:' in updated_content:
                    updated_content = re.sub(
                        r'validationStatus:\s*["\'][^"\']*["\']',
                        'validationStatus: "manually-verified"',
                        updated_content
                    )
                else:
                    updated_content += ',\n    validationStatus: "manually-verified"'
                
                if 'validationDate:' in updated_content:
                    updated_content = re.sub(
                        r'validationDate:\s*["\'][^"\']*["\']',
                        f'validationDate: "{current_date}"',
                        updated_content
                    )
                else:
                    updated_content += f',\n    validationDate: "{current_date}"'
                
                # Replace the scale entry in the full content
                new_scale_entry = f'{scale_name}: {{\n    {updated_content}\n  }}'
                js_content = re.sub(scale_pattern, new_scale_entry, js_content, flags=re.DOTALL)
                
            else:
                # Create new entry for this scale
                new_entry = f'''  {scale_name}: {{
    description: "Scale requiring manual verification",
    references: [
      {json.dumps(new_reference, indent=6)[6:]}
    ],
    validationStatus: "manually-verified",
    validationDate: "{current_date}"
  }}'''
                
                # Insert before the closing brace of scaleCitations
                citations_end = citations_match.end() - 2  # Before "};"
                js_content = js_content[:citations_end] + ',\n' + new_entry + '\n' + js_content[citations_end:]
            
            # Write back to file
            with open(self.js_file_path, 'w', encoding='utf-8') as f:
                f.write(js_content)
                
            print(f"✅ Added source to {scale_name} and marked as manually-verified")
            
        except Exception as e:
            print(f"❌ Error updating scaleCitations for {scale_name}: {e}")
            raise

    def reject_all_sources(self, scale_name: str) -> None:
        """
        Set validationStatus to "limited-documentation" and mark scale as reviewed.
        
        Args:
            scale_name: Name of the scale to reject
            
        Note:
            Updates validationStatus to "limited-documentation" and marks as reviewed in progress
        """
        try:
            # Read the JavaScript file
            with open(self.js_file_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
            
            # Find the scaleCitations object
            citations_match = re.search(r'this\.scaleCitations\s*=\s*\{(.*?)\};', js_content, re.DOTALL)
            if not citations_match:
                raise ValueError("Could not find scaleCitations object in JavaScript file")
            
            citations_content = citations_match.group(1)
            current_date = datetime.now().strftime('%Y-%m-%d')
            
            # Look for existing entry for this scale
            scale_pattern = rf'{re.escape(scale_name)}\s*:\s*\{{([^}}]*(?:\{{[^}}]*\}}[^}}]*)*)\}}'
            scale_match = re.search(scale_pattern, citations_content, re.DOTALL)
            
            if scale_match:
                # Update existing entry
                existing_content = scale_match.group(1)
                
                # Update validation status
                if 'validationStatus:' in existing_content:
                    updated_content = re.sub(
                        r'validationStatus:\s*["\'][^"\']*["\']',
                        'validationStatus: "limited-documentation"',
                        existing_content
                    )
                else:
                    updated_content = existing_content.rstrip() + ',\n    validationStatus: "limited-documentation"'
                
                # Update validation date
                if 'validationDate:' in updated_content:
                    updated_content = re.sub(
                        r'validationDate:\s*["\'][^"\']*["\']',
                        f'validationDate: "{current_date}"',
                        updated_content
                    )
                else:
                    updated_content += f',\n    validationDate: "{current_date}"'
                
                # Replace the scale entry in the full content
                new_scale_entry = f'{scale_name}: {{\n    {updated_content}\n  }}'
                js_content = re.sub(scale_pattern, new_scale_entry, js_content, flags=re.DOTALL)
                
            else:
                # Create new entry for this scale
                new_entry = f'''  {scale_name}: {{
    description: "Scale with limited documentation available",
    validationStatus: "limited-documentation",
    validationDate: "{current_date}"
  }}'''
                
                # Insert before the closing brace of scaleCitations
                citations_end = citations_match.end() - 2  # Before "};"
                js_content = js_content[:citations_end] + ',\n' + new_entry + '\n' + js_content[citations_end:]
            
            # Write back to file
            with open(self.js_file_path, 'w', encoding='utf-8') as f:
                f.write(js_content)
            
            # Update progress to mark this scale as reviewed
            progress = self.get_review_progress()
            if scale_name not in progress.get('reviewedScales', []):
                progress['reviewedScales'].append(scale_name)
            if scale_name not in progress.get('rejectedScales', []):
                progress['rejectedScales'].append(scale_name)
            
            # Remove from remaining scales if present
            remaining = progress.get('remainingScales', [])
            if scale_name in remaining:
                remaining.remove(scale_name)
                progress['remainingScales'] = remaining
            
            self.save_progress(progress)
            
            print(f"❌ Rejected all sources for {scale_name} and marked as limited-documentation")
            
        except Exception as e:
            print(f"❌ Error rejecting sources for {scale_name}: {e}")
            raise

    def save_progress(self, progress_data: Optional[Dict[str, Any]] = None) -> None:
        """
        Write current state to review_progress.json.
        
        Args:
            progress_data: Progress data to save, or None to save current state
            
        Note:
            Includes reviewed scales, remaining count, timestamps
            Requirements: 3.6
        """
        if progress_data is None:
            progress_data = self.get_review_progress()
        
        # Update timestamp
        progress_data["lastUpdated"] = datetime.now().isoformat()
        
        # Ensure all required fields are present
        if "totalReviewScales" not in progress_data:
            # Calculate total REVIEW scales from validation data
            try:
                with open(self.validation_json_path, 'r', encoding='utf-8') as f:
                    validation_data = json.load(f)
                total_review = sum(1 for result in validation_data.get('results', []) 
                                 if result.get('recommendation', '').upper() == 'REVIEW')
                progress_data["totalReviewScales"] = total_review
            except Exception:
                progress_data["totalReviewScales"] = 0
        
        # Ensure all required arrays exist
        for field in ["reviewedScales", "remainingScales", "rejectedScales"]:
            if field not in progress_data:
                progress_data[field] = []
        
        if "approvedSources" not in progress_data:
            progress_data["approvedSources"] = {}
        
        # Update remaining scales count based on current state
        try:
            with open(self.validation_json_path, 'r', encoding='utf-8') as f:
                validation_data = json.load(f)
            
            all_review_scales = [result.get('scale_name', '') 
                               for result in validation_data.get('results', [])
                               if result.get('recommendation', '').upper() == 'REVIEW']
            
            reviewed_set = set(progress_data.get('reviewedScales', []))
            remaining_scales = [scale for scale in all_review_scales if scale not in reviewed_set]
            progress_data["remainingScales"] = remaining_scales
            
        except Exception as e:
            print(f"Warning: Could not update remaining scales count: {e}")
        
        try:
            with open(self.progress_file_path, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, indent=2, ensure_ascii=False)
        except IOError as e:
            raise IOError(f"Cannot save progress file {self.progress_file_path}: {e}")

    def run_batch(self) -> Dict[str, Any]:
        """
        Orchestrate full batch review session.
        
        Returns:
            Dictionary containing session summary with counts and results
            
        Note:
            Handles user cancellation gracefully, shows summary at end of batch
            Requirements: 3.6
        """
        print("🎵 Starting Batch Review Session")
        print("=" * 60)
        
        # Load current progress
        progress = self.get_review_progress()
        
        # Get next batch of scales to review
        batch = self.get_next_batch(10)
        
        if not batch:
            print("✅ No more scales to review! All REVIEW-status scales have been processed.")
            return {
                "session_complete": True,
                "scales_processed": 0,
                "scales_approved": 0,
                "scales_rejected": 0,
                "scales_skipped": 0,
                "remaining_count": 0
            }
        
        print(f"📋 Found {len(batch)} scales in this batch")
        remaining_total = len(progress.get('remainingScales', [])) + len(batch)
        print(f"📊 Total remaining scales: {remaining_total}")
        print(f"📅 Last updated: {progress.get('lastUpdated', 'Never')}")
        
        # Session tracking
        session_stats = {
            "scales_processed": 0,
            "scales_approved": 0,
            "scales_rejected": 0,
            "scales_skipped": 0,
            "session_complete": False,
            "user_cancelled": False
        }
        
        try:
            for i, scale in enumerate(batch, 1):
                scale_name = scale.get('scale_name', 'Unknown')
                
                print(f"\n🔍 Processing scale {i}/{len(batch)}: {scale_name}")
                
                # Search for sources
                print(f"   Searching for sources...")
                sources = self.search_scale(scale_name)
                
                # Present for review
                decision = self.present_for_review(scale, sources)
                
                # Handle user decision
                if decision == 'approve' and sources:
                    # Use the best quality source (first in sorted list)
                    best_source = sources[0]
                    self.approve_source(scale_name, best_source)
                    
                    # Update progress
                    if scale_name not in progress.get('reviewedScales', []):
                        progress['reviewedScales'].append(scale_name)
                    if scale_name not in progress.get('approvedSources', {}):
                        progress['approvedSources'][scale_name] = [best_source]
                    
                    session_stats["scales_approved"] += 1
                    
                elif decision == 'reject':
                    self.reject_all_sources(scale_name)
                    session_stats["scales_rejected"] += 1
                    
                elif decision == 'skip':
                    print(f"⏭️  Skipped {scale_name} for later review")
                    session_stats["scales_skipped"] += 1
                    continue  # Don't mark as reviewed
                
                session_stats["scales_processed"] += 1
                
                # Save progress after each scale
                self.save_progress(progress)
                
                # Check if user wants to continue
                if i < len(batch):  # Don't ask after the last scale
                    print(f"\n📊 Progress: {i}/{len(batch)} scales processed in this batch")
                    continue_choice = input("Continue with next scale? (y/n/q to quit): ").lower().strip()
                    
                    if continue_choice == 'q':
                        print("\n👋 User requested to quit. Progress has been saved.")
                        session_stats["user_cancelled"] = True
                        break
                    elif continue_choice == 'n':
                        print("\n⏸️  Pausing batch review. Progress has been saved.")
                        session_stats["user_cancelled"] = True
                        break
        
        except KeyboardInterrupt:
            print("\n\n⚠️  Batch review interrupted by user (Ctrl+C)")
            print("💾 Saving progress...")
            self.save_progress(progress)
            session_stats["user_cancelled"] = True
        
        except Exception as e:
            print(f"\n❌ Error during batch review: {e}")
            print("💾 Saving progress...")
            self.save_progress(progress)
            raise
        
        # Final progress save
        self.save_progress(progress)
        
        # Calculate final statistics
        updated_progress = self.get_review_progress()
        remaining_count = len(updated_progress.get('remainingScales', []))
        session_stats["remaining_count"] = remaining_count
        
        if not session_stats["user_cancelled"] and remaining_count == 0:
            session_stats["session_complete"] = True
        
        # Show session summary
        print(f"\n{'='*60}")
        print("📊 BATCH REVIEW SESSION SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Scales approved: {session_stats['scales_approved']}")
        print(f"❌ Scales rejected: {session_stats['scales_rejected']}")
        print(f"⏭️  Scales skipped: {session_stats['scales_skipped']}")
        print(f"📝 Total processed: {session_stats['scales_processed']}")
        print(f"📋 Remaining scales: {remaining_count}")
        
        if session_stats["session_complete"]:
            print(f"\n🎉 ALL REVIEW SCALES COMPLETED!")
            print(f"🏆 Total reviewed scales: {len(updated_progress.get('reviewedScales', []))}")
        elif session_stats["user_cancelled"]:
            print(f"\n⏸️  Session paused by user")
            print(f"🔄 Run again to continue with remaining {remaining_count} scales")
        else:
            print(f"\n📅 Batch complete - {remaining_count} scales remaining")
            print(f"🔄 Run again to process the next batch")
        
        print(f"💾 Progress saved to: {self.progress_file_path}")
        print(f"{'='*60}")
        
        return session_stats


if __name__ == "__main__":
    # CLI interface for running the batch review
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python batch_review_scales.py <validation_json> <js_file>")
        print("Example: python batch_review_scales.py scale_validation_results.json music-theory-engine.js")
        sys.exit(1)
    
    validation_json = sys.argv[1]
    js_file = sys.argv[2]
    
    try:
        batch_tool = BatchReviewTool(validation_json, js_file)
        print(f"🎵 BatchReviewTool initialized successfully")
        print(f"📁 Validation JSON: {validation_json}")
        print(f"📁 JS File: {js_file}")
        
        # Run the batch review session
        results = batch_tool.run_batch()
        
        # Exit with appropriate code
        if results.get("session_complete", False):
            print("\n🎉 All scales have been reviewed!")
            sys.exit(0)
        elif results.get("user_cancelled", False):
            print("\n👋 Session ended by user")
            sys.exit(0)
        else:
            print("\n📅 Batch completed - more scales remain")
            sys.exit(0)
        
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)