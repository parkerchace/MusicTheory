#!/usr/bin/env python3
"""
Alignment & Layout Analyzer for Learn Inversions Module
Validates spacing, positioning, and responsive design properties
"""

import json
import re
from pathlib import Path

class AlignmentAnalyzer:
    """Analyzes CSS alignment and spacing in HTML/JS files"""
    
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.suggestions = []
        
    def analyze_css_string(self, css_text, context=""):
        """Analyze a CSS string for alignment issues"""
        
        # Check for hardcoded pixel values that might not be responsive
        hardcoded_sizes = re.findall(r'(\d+)px', css_text)
        if hardcoded_sizes and len(hardcoded_sizes) > 5:
            self.warnings.append(
                f"{context}: Many hardcoded pixel values found. Consider using percentages, max-widths, etc. "
                f"Found: {', '.join(set(hardcoded_sizes))}px"
            )
        
        # Check for centering patterns
        if 'margin: 0 auto' in css_text or 'justify-content: center' in css_text:
            pass  # Good
        elif 'left:' in css_text and 'transform:' not in css_text:
            self.issues.append(f"{context}: Uses 'left' positioning without transform. May not center properly.")
        
        # Check for minimum widths on buttons/controls
        if 'min-width' in css_text and 'max-width' not in css_text:
            self.warnings.append(f"{context}: Has min-width but no max-width. May overflow on small screens.")
        
        # Check gap values
        gaps = re.findall(r'gap:\s*(\d+)px', css_text)
        if gaps:
            gap_vals = [int(g) for g in gaps]
            if max(gap_vals) > 32 or min(gap_vals) < 4:
                self.suggestions.append(
                    f"{context}: Inconsistent gaps found {gap_vals}px. Consider standardizing to 8/12/16/20/24px increments."
                )
        
        # Check padding consistency
        paddings = re.findall(r'padding:\s*(\d+)px', css_text)
        if paddings:
            self.suggestions.append(
                f"{context}: Padding values: {set(paddings)}px. Aim for consistent spacing scale."
            )
    
    def analyze_responsive_design(self, css_text):
        """Check for responsive design patterns"""
        
        if 'max-width' not in css_text:
            self.warnings.append("No max-width constraints found. May overflow on wide screens.")
        
        if 'clamp' not in css_text and 'calc' not in css_text and 'max(' not in css_text:
            self.suggestions.append(
                "Consider using CSS clamp() or max() for truly responsive sizing: "
                "width: min(90%, 600px) or font-size: clamp(1rem, 5vw, 2rem)"
            )
        
        if 'flex-wrap' not in css_text and 'flex' in css_text:
            self.warnings.append(
                "Flexbox used but no flex-wrap. May not respond well to small screens."
            )
    
    def analyze_grid_layout(self, css_text):
        """Check grid layout responsiveness"""
        
        if 'grid-template-columns: repeat(auto-fit' in css_text:
            pass  # Excellent!
        elif 'grid-template-columns:' in css_text:
            cols = re.search(r'grid-template-columns:\s*([^;]+)', css_text)
            if cols and 'auto' not in cols.group(1):
                self.warnings.append(
                    f"Grid layout not fully responsive: {cols.group(1)}. "
                    "Use repeat(auto-fit, minmax(X, 1fr)) for responsive grids."
                )
    
    def print_report(self):
        """Print analysis report"""
        print("\n" + "="*70)
        print("ALIGNMENT & RESPONSIVE DESIGN ANALYSIS REPORT")
        print("="*70 + "\n")
        
        if self.issues:
            print("🔴 CRITICAL ISSUES:")
            for i, issue in enumerate(self.issues, 1):
                print(f"  {i}. {issue}")
            print()
        
        if self.warnings:
            print("🟡 WARNINGS:")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
            print()
        
        if self.suggestions:
            print("💡 SUGGESTIONS:")
            for i, suggestion in enumerate(self.suggestions, 1):
                print(f"  {i}. {suggestion}")
            print()
        
        print("="*70)
        status = f"Issues: {len(self.issues)}, Warnings: {len(self.warnings)}, Suggestions: {len(self.suggestions)}"
        print(f"SUMMARY: {status}")
        print("="*70 + "\n")


class ResponsiveUnitConverter:
    """Convert hardcoded pixels to responsive units"""
    
    @staticmethod
    def suggest_conversion(px_value):
        """Suggest responsive alternative for px value"""
        
        px = int(px_value)
        
        conversions = {
            4: ("0.25rem", "min(4px, 0.5vw)", "Extra small spacing"),
            8: ("0.5rem", "clamp(4px, 1vw, 12px)", "Small spacing"),
            12: ("0.75rem", "clamp(8px, 1.5vw, 16px)", "Medium spacing"),
            16: ("1rem", "clamp(12px, 2vw, 20px)", "Standard spacing"),
            20: ("1.25rem", "clamp(16px, 2.5vw, 24px)", "Medium-large"),
            24: ("1.5rem", "clamp(20px, 3vw, 28px)", "Large spacing"),
            32: ("2rem", "clamp(24px, 4vw, 36px)", "Extra large spacing"),
        }
        
        if px in conversions:
            rem, clamp_val, desc = conversions[px]
            return f"{px}px → {rem} (or {clamp_val}) - {desc}"
        else:
            return f"{px}px → {px/16:.2f}rem (estimated)"
    
    @staticmethod
    def get_spacing_scale():
        """Return recommended spacing scale"""
        return {
            'xs': '0.25rem (4px)',
            'sm': '0.5rem (8px)',
            'md': '0.75rem (12px)',
            'base': '1rem (16px)',
            'lg': '1.25rem (20px)',
            'xl': '1.5rem (24px)',
            '2xl': '2rem (32px)',
            '3xl': '3rem (48px)',
        }


class AudioQualityChecker:
    """Validates audio engine configuration"""
    
    @staticmethod
    def check_reverb_settings(config):
        """Check reverb configuration"""
        
        issues = []
        
        if config.get('reverbAmount', 0) > 0.5:
            issues.append(f"Reverb amount too high: {config['reverbAmount']}. Consider max 0.3 for clarity.")
        
        if config.get('reverbAmount', 0) == 0 and config.get('useReverb', False):
            issues.append("Reverb enabled but amount is 0. Either disable or increase amount.")
        
        return issues
    
    @staticmethod
    def check_envelope_settings(config):
        """Check ADSR-style envelope"""
        
        issues = []
        attack = config.get('attackTime', 0)
        sustain = config.get('sustainTime', 0)
        release = config.get('releaseTime', 0)
        
        total = attack + sustain + release
        
        if total < 0.3:
            issues.append(f"Total envelope time very short ({total}s). Notes may sound clipped.")
        
        if sustain < attack:
            issues.append(f"Sustain ({sustain}s) shorter than attack ({attack}s). May sound odd.")
        
        if attack > 0.1:
            issues.append(f"Attack very slow ({attack}s). May sound sluggish.")
        
        return issues
    
    @staticmethod
    def print_audio_recommendations():
        """Print audio configuration recommendations"""
        
        print("\n" + "="*70)
        print("RECOMMENDED AUDIO CONFIGURATIONS")
        print("="*70 + "\n")
        
        configs = {
            'Single Notes (Interactive)': {
                'attackTime': 0.02,
                'sustainTime': 0.5,
                'releaseTime': 0.3,
                'reverbAmount': 0.08
            },
            'Progressions (Learning)': {
                'attackTime': 0.05,
                'sustainTime': 1.5,
                'releaseTime': 0.4,
                'reverbAmount': 0.12
            },
            'Arpeggios (Voice Leading)': {
                'attackTime': 0.03,
                'sustainTime': 0.8,
                'releaseTime': 0.35,
                'reverbAmount': 0.10
            },
            'Piano Simulation': {
                'attackTime': 0.01,
                'sustainTime': 2.0,
                'releaseTime': 0.5,
                'reverbAmount': 0.15
            }
        }
        
        for name, config in configs.items():
            print(f"{name}:")
            print(f"  Attack:  {config['attackTime']:.2f}s")
            print(f"  Sustain: {config['sustainTime']:.1f}s")
            print(f"  Release: {config['releaseTime']:.2f}s")
            print(f"  Reverb:  {config['reverbAmount']:.0%}")
            print()
        
        print("="*70 + "\n")


def main():
    """Run all analyzers"""
    
    print("\n🎯 LEARN INVERSIONS MODULE - ANALYSIS TOOLS\n")
    
    # 1. Show spacing scale
    print("📐 RECOMMENDED SPACING SCALE:")
    print("-" * 70)
    scale = ResponsiveUnitConverter.get_spacing_scale()
    for name, value in scale.items():
        print(f"  {name:6s}: {value}")
    print()
    
    # 2. Show audio recommendations
    AudioQualityChecker.print_audio_recommendations()
    
    # 3. Show responsive patterns
    print("📱 RESPONSIVE DESIGN PATTERNS:")
    print("-" * 70)
    print("""
  1. Side-by-side layout:
     grid-template-columns: 1fr 300px;
     Breaks to stacked on small screens with: 
     @media (max-width: 768px) { grid-template-columns: 1fr; }
  
  2. Button grids:
     grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
     Automatically adjusts column count based on available space
  
  3. Flexible widths:
     width: min(90%, 600px);
     Responsive: 90% on small screens, capped at 600px on large
  
  4. Font sizing:
     font-size: clamp(0.9rem, 2vw, 1.2rem);
     Scales between 0.9rem and 1.2rem as viewport changes
  
  5. Gap sizing:
     gap: clamp(8px, 2vw, 24px);
     Spacing scales with viewport size
    """)
    
    print("="*70)
    print("✅ All analysis complete!")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
