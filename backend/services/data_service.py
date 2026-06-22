"""
Data service for handling composition dataset.
Reads and processes Excel file with composition data.
"""
import pandas as pd
import json
from typing import List, Dict, Optional
from pathlib import Path
from config import settings

# Path to dataset
DATA_FILE = Path(__file__).parent.parent.parent / "data" / "composition_emotions_dataset.xlsx"
NEW_COMPOSERS_FILE = Path(__file__).parent.parent.parent / "data" / "new_composers.json"

# Cache for dataset
_dataset_cache = None


def load_dataset() -> pd.DataFrame:
    """Load dataset from Excel file with caching."""
    global _dataset_cache
    if _dataset_cache is None:
        _dataset_cache = pd.read_excel(DATA_FILE)
    return _dataset_cache


def get_composers_summary() -> Dict:
    """
    Get summary of all composers with composition counts.
    Returns dict with labeled and unlabeled composers.
    Merges data from Excel file and new composers JSON file.
    """
    df = load_dataset()
    
    # Separate labeled and unlabeled compositions from Excel
    # Labeled = has at least Emotion 1
    labeled_df = df[df['Emotion 1'].notna()]
    unlabeled_df = df[df['Emotion 1'].isna()]
    
    # Group by composer and count compositions
    labeled_counts = labeled_df.groupby('Composer Name').size().to_dict()
    unlabeled_counts = unlabeled_df.groupby('Composer Name').size().to_dict()
    
    # Track additional labeled/unlabeled compositions from new_composers.json
    additional_labeled_count = 0
    additional_unlabeled_count = 0
    
    # Process new_composers.json to add/update labeled/unlabeled compositions
    new_composers = load_new_composers()
    for composer in new_composers:
        composer_name = composer['name']
        
        # Get compositions from Excel for this composer to check for duplicates
        composer_excel_df = df[df['Composer Name'] == composer_name]
        excel_comp_names = set(composer_excel_df['Composition Name'].str.lower())
        
        labeled_count_new = 0
        unlabeled_count_new = 0
        moved_from_unlabeled = 0  # Compositions that were unlabeled in Excel but now labeled
        
        for comp in composer.get('compositions', []):
            if isinstance(comp, dict):
                comp_name = comp.get('name', '').lower()
                emotions = comp.get('emotions', [])
                has_emotions = emotions and len(emotions) > 0
                
                # Check if this composition exists in Excel
                is_in_excel = comp_name in excel_comp_names
                
                if is_in_excel:
                    # Check if it was unlabeled in Excel
                    was_unlabeled = comp_name in set(
                        composer_excel_df[composer_excel_df['Emotion 1'].isna()]['Composition Name'].str.lower()
                    )
                    was_labeled = comp_name in set(
                        composer_excel_df[composer_excel_df['Emotion 1'].notna()]['Composition Name'].str.lower()
                    )
                    
                    if was_unlabeled and has_emotions:
                        # This composition is being moved from unlabeled to labeled
                        moved_from_unlabeled += 1
                    # If was_labeled and has_emotions: do nothing, it's just additional emotions for already labeled
                else:
                    # New composition not in Excel
                    if has_emotions:
                        labeled_count_new += 1
                    else:
                        unlabeled_count_new += 1
            else:
                # Old format: string (treat as unlabeled new composition)
                unlabeled_count_new += 1
        
        # Update counts
        if moved_from_unlabeled > 0:
            # Move from unlabeled to labeled
            unlabeled_counts[composer_name] = unlabeled_counts.get(composer_name, 0) - moved_from_unlabeled
            labeled_counts[composer_name] = labeled_counts.get(composer_name, 0) + moved_from_unlabeled
            additional_labeled_count += moved_from_unlabeled
            additional_unlabeled_count -= moved_from_unlabeled
        
        if labeled_count_new > 0:
            labeled_counts[composer_name] = labeled_counts.get(composer_name, 0) + labeled_count_new
            additional_labeled_count += labeled_count_new
            
        if unlabeled_count_new > 0:
            unlabeled_counts[composer_name] = unlabeled_counts.get(composer_name, 0) + unlabeled_count_new
            additional_unlabeled_count += unlabeled_count_new
    
    labeled_composers = [
        {"name": composer, "composition_count": count}
        for composer, count in sorted(labeled_counts.items())
        if count > 0  # Only include composers with labeled compositions
    ]
    
    unlabeled_composers = [
        {"name": composer, "composition_count": count}
        for composer, count in sorted(unlabeled_counts.items())
        if count > 0  # Only include composers with unlabeled compositions
    ]
    
    return {
        "labeled": labeled_composers,
        "unlabeled": unlabeled_composers,
        "total_compositions": len(df) + additional_labeled_count + additional_unlabeled_count,
        "labeled_count": len(labeled_df) + additional_labeled_count,
        "unlabeled_count": len(unlabeled_df) + additional_unlabeled_count,
        "collection_target": settings.collection_target
    }


def get_composer_compositions(composer_name: str, labeled: bool = True) -> List[Dict]:
    """Get compositions for a specific composer.
    
    Args:
        composer_name: Name of the composer
        labeled: If True, return only labeled compositions. If False, return only unlabeled.
    """
    df = load_dataset()
    composer_df = df[df['Composer Name'] == composer_name]
    
    # Filter by labeled/unlabeled status
    if labeled:
        composer_df = composer_df[composer_df['Emotion 1'].notna()]
    else:
        composer_df = composer_df[composer_df['Emotion 1'].isna()]
    
    compositions = []
    compositions_map = {}  # Track compositions by name for merging
    
    for _, row in composer_df.iterrows():
        # Get all emotions for this composition
        emotions = []
        for i in range(1, 12):  # Emotion 1 through Emotion 11
            emotion = row.get(f'Emotion {i}')
            if pd.notna(emotion):
                emotions.append(emotion)
        
        comp_name = row['Composition Name']
        compositions_map[comp_name.lower()] = {
            "name": comp_name,
            "emotions": emotions,
            "emotion_count": len(emotions),
            "youtube_url": row.get('YouTube URL') if pd.notna(row.get('YouTube URL')) else None
        }
    
    # Also check new_composers.json file and merge/add compositions
    new_composers = load_new_composers()
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            for comp in composer.get('compositions', []):
                # Handle both string format (old) and object format (new)
                if isinstance(comp, str):
                    # Old format: just a string (treat as unlabeled)
                    if not labeled:
                        comp_name_lower = comp.lower()
                        if comp_name_lower not in compositions_map:
                            compositions_map[comp_name_lower] = {
                                "name": comp,
                                "emotions": [],
                                "emotion_count": 0
                            }
                else:
                    # New format: object with name, youtube_url, emotions
                    comp_name = comp.get('name', '')
                    comp_name_lower = comp_name.lower()
                    emotions = comp.get('emotions', [])
                    has_emotions = len(emotions) > 0
                    
                    if comp_name_lower in compositions_map:
                        # Merge emotions from both sources (for labeled compositions)
                        if labeled:
                            existing = compositions_map[comp_name_lower]
                            all_emotions = existing['emotions'] + emotions
                            # Remove duplicates while preserving order
                            seen = set()
                            merged_emotions = []
                            for emotion in all_emotions:
                                if emotion not in seen:
                                    seen.add(emotion)
                                    merged_emotions.append(emotion)
                            
                            existing['emotions'] = merged_emotions
                            existing['emotion_count'] = len(merged_emotions)
                            # Update YouTube URL if available in new_composers
                            if comp.get('youtube_url'):
                                existing['youtube_url'] = comp.get('youtube_url')
                    else:
                        # New composition only in new_composers.json
                        # Only include if labeled status matches
                        if (labeled and has_emotions) or (not labeled and not has_emotions):
                            compositions_map[comp_name_lower] = {
                                "name": comp_name,
                                "youtube_url": comp.get('youtube_url'),
                                "emotions": emotions,
                                "emotion_count": len(emotions)
                            }
            break
    
    # Convert map to list
    compositions = list(compositions_map.values())
    
    return compositions


def get_all_emotions() -> List[str]:
    """Get list of all unique emotions in the dataset."""
    df = load_dataset()
    emotions = set()
    
    # Get emotions from Excel file
    for i in range(1, 12):  # Emotion 1 through Emotion 11
        col_emotions = df[f'Emotion {i}'].dropna().unique()
        emotions.update(col_emotions)
    
    # Get emotions from new_composers.json
    new_composers = load_new_composers()
    for composer in new_composers:
        for comp in composer.get('compositions', []):
            if isinstance(comp, dict):
                comp_emotions = comp.get('emotions', [])
                emotions.update(comp_emotions)
    
    return sorted(list(emotions))


def load_new_composers() -> List[Dict]:
    """Load new composers from JSON file."""
    if not NEW_COMPOSERS_FILE.exists():
        return []
    
    try:
        with open(NEW_COMPOSERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_new_composers(composers: List[Dict]):
    """Save new composers to JSON file."""
    NEW_COMPOSERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(NEW_COMPOSERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(composers, f, indent=2, ensure_ascii=False)


def add_new_composer(composer_name: str) -> Dict:
    """
    Add a new composer to the separate JSON file (not the Excel file).
    
    Args:
        composer_name: Full name of the composer
    
    Returns:
        Dict with success status and message
    """
    # Load existing new composers
    new_composers = load_new_composers()
    
    # Check if composer already exists in the new composers list
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            raise ValueError(f"Composer '{composer_name}' already exists in new composers")
    
    # Check if composer exists in original Excel file
    df = load_dataset()
    existing_in_excel = df[df['Composer Name'].str.lower() == composer_name.lower()]
    if len(existing_in_excel) > 0:
        raise ValueError(f"Composer '{composer_name}' already exists in the dataset")
    
    # Add new composer
    new_composers.append({
        'name': composer_name,
        'compositions': []  # Empty composition list for new composer
    })
    
    # Save to JSON file
    save_new_composers(new_composers)
    
    return {
        "success": True,
        "message": f"Added composer '{composer_name}' successfully"
    }


def add_composition_to_composer(composer_name: str, composition_name: str, youtube_url: Optional[str] = None) -> Dict:
    """
    Add a new composition to a composer in the new_composers.json file.
    
    Args:
        composer_name: Full name of the composer
        composition_name: Name of the composition
        youtube_url: Optional YouTube URL for the composition
    
    Returns:
        Dict with success status and message
    """
    # Load existing new composers
    new_composers = load_new_composers()
    
    # Find the composer
    composer_found = False
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            composer_found = True
            
            # Check if composition already exists for this composer
            for comp in composer.get('compositions', []):
                comp_name = comp if isinstance(comp, str) else comp.get('name', '')
                if comp_name.lower() == composition_name.lower():
                    raise ValueError(f"Composition '{composition_name}' already exists for composer '{composer_name}'")
            
            # Add the composition
            if 'compositions' not in composer:
                composer['compositions'] = []
            
            # Store composition as object with name and optional youtube_url
            composition_data = {
                'name': composition_name,
                'youtube_url': youtube_url if youtube_url else None,
                'emotions': []  # Empty emotions list for new composition
            }
            composer['compositions'].append(composition_data)
            break
    
    if not composer_found:
        raise ValueError(f"Composer '{composer_name}' not found in new composers. Please add the composer first.")
    
    # Save to JSON file
    save_new_composers(new_composers)
    
    return {
        "success": True,
        "message": f"Added composition '{composition_name}' to composer '{composer_name}' successfully"
    }


def add_emotions_to_composition(composer_name: str, composition_name: str, emotions: List[str]) -> Dict:
    """
    Add emotions to a composition. For compositions from the Excel file or new_composers.json,
    this adds emotions only to new_composers.json (never modifying the Excel file).
    
    Args:
        composer_name: Full name of the composer
        composition_name: Name of the composition
        emotions: List of emotion labels to add
    
    Returns:
        Dict with success status and message
    """
    if not emotions:
        raise ValueError("At least one emotion must be provided")
    
    new_composers = load_new_composers()
    
    # Check if composer exists in new_composers.json
    composer_found = False
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            composer_found = True
            
            # Find the composition
            composition_found = False
            for comp in composer.get('compositions', []):
                if isinstance(comp, dict) and comp.get('name', '').lower() == composition_name.lower():
                    composition_found = True
                    # Add emotions to existing list (avoid duplicates)
                    existing_emotions = comp.get('emotions', [])
                    for emotion in emotions:
                        if emotion not in existing_emotions:
                            existing_emotions.append(emotion)
                    comp['emotions'] = existing_emotions
                    break
            
            if not composition_found:
                # Composition doesn't exist in new_composers.json yet
                # This means it's from the Excel file and we're adding new labels
                # Add it to this composer's compositions in new_composers.json
                if 'compositions' not in composer:
                    composer['compositions'] = []
                
                composer['compositions'].append({
                    'name': composition_name,
                    'youtube_url': None,  # Will be fetched from Excel if needed
                    'emotions': emotions
                })
            break
    
    if not composer_found:
        # Composer doesn't exist in new_composers.json
        # This is a composer from the Excel file, so add them with this composition
        new_composers.append({
            'name': composer_name,
            'compositions': [{
                'name': composition_name,
                'youtube_url': None,
                'emotions': emotions
            }]
        })
    
    # Save to JSON file
    save_new_composers(new_composers)
    
    return {
        "success": True,
        "message": f"Added {len(emotions)} emotion(s) to '{composition_name}' by {composer_name}"
    }


def label_unlabeled_composition(composer_name: str, composition_name: str, emotions: List[str]) -> Dict:
    """
    Label an unlabeled composition. This moves it from unlabeled to labeled in new_composers.json.
    If the composition is from Excel file, adds it to new_composers.json with labels.
    
    Args:
        composer_name: Full name of the composer
        composition_name: Name of the composition
        emotions: List of emotion labels
    
    Returns:
        Dict with success status and message
    """
    if not emotions:
        raise ValueError("At least one emotion must be provided")
    
    new_composers = load_new_composers()
    
    # Find and update the composition in new_composers.json
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            for comp in composer.get('compositions', []):
                if isinstance(comp, dict) and comp.get('name', '').lower() == composition_name.lower():
                    # Found it - add emotions
                    comp['emotions'] = emotions
                    save_new_composers(new_composers)
                    return {
                        "success": True,
                        "message": f"Labeled '{composition_name}' by {composer_name} with {len(emotions)} emotion(s)"
                    }
    
    # If not found in new_composers.json, it's from Excel file
    # Add it to new_composers.json as labeled
    composer_found = False
    for composer in new_composers:
        if composer['name'].lower() == composer_name.lower():
            composer_found = True
            if 'compositions' not in composer:
                composer['compositions'] = []
            composer['compositions'].append({
                'name': composition_name,
                'youtube_url': None,
                'emotions': emotions
            })
            break
    
    if not composer_found:
        # Add new composer with this labeled composition
        new_composers.append({
            'name': composer_name,
            'compositions': [{
                'name': composition_name,
                'youtube_url': None,
                'emotions': emotions
            }]
        })
    
    save_new_composers(new_composers)
    
    return {
        "success": True,
        "message": f"Labeled '{composition_name}' by {composer_name} with {len(emotions)} emotion(s)"
    }
