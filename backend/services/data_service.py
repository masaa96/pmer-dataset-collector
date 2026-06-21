"""
Data service for handling composition dataset.
Reads and processes Excel file with composition data.
"""
import pandas as pd
import json
from typing import List, Dict, Optional
from pathlib import Path

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
    
    labeled_composers = [
        {"name": composer, "composition_count": count}
        for composer, count in sorted(labeled_counts.items())
    ]
    
    unlabeled_composers = [
        {"name": composer, "composition_count": count}
        for composer, count in sorted(unlabeled_counts.items())
    ]
    
    # Add new composers from JSON file (these are all unlabeled with 0 compositions initially)
    new_composers = load_new_composers()
    for composer in new_composers:
        # Check if composer is not already in unlabeled list from Excel
        if not any(c['name'].lower() == composer['name'].lower() for c in unlabeled_composers):
            unlabeled_composers.append({
                "name": composer['name'],
                "composition_count": len(composer.get('compositions', []))
            })
    
    # Sort unlabeled composers by name
    unlabeled_composers = sorted(unlabeled_composers, key=lambda x: x['name'])
    
    return {
        "labeled": labeled_composers,
        "unlabeled": unlabeled_composers,
        "total_compositions": len(df),
        "labeled_count": len(labeled_df),
        "unlabeled_count": len(unlabeled_df)
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
    for _, row in composer_df.iterrows():
        # Get all emotions for this composition
        emotions = []
        for i in range(1, 12):  # Emotion 1 through Emotion 11
            emotion = row.get(f'Emotion {i}')
            if pd.notna(emotion):
                emotions.append(emotion)
        
        compositions.append({
            "name": row['Composition Name'],
            "emotions": emotions,
            "emotion_count": len(emotions)
        })
    
    # For unlabeled, also check new_composers.json file
    if not labeled:
        new_composers = load_new_composers()
        for composer in new_composers:
            if composer['name'].lower() == composer_name.lower():
                # Add compositions from JSON file (if any)
                for comp in composer.get('compositions', []):
                    # Handle both string format (old) and object format (new)
                    if isinstance(comp, str):
                        # Old format: just a string
                        compositions.append({
                            "name": comp,
                            "emotions": [],
                            "emotion_count": 0
                        })
                    else:
                        # New format: object with name, youtube_url, emotions
                        compositions.append({
                            "name": comp.get('name', ''),
                            "youtube_url": comp.get('youtube_url'),
                            "emotions": comp.get('emotions', []),
                            "emotion_count": len(comp.get('emotions', []))
                        })
                break
    
    return compositions


def get_all_emotions() -> List[str]:
    """Get list of all unique emotions in the dataset."""
    df = load_dataset()
    emotions = set()
    
    for i in range(1, 12):  # Emotion 1 through Emotion 11
        col_emotions = df[f'Emotion {i}'].dropna().unique()
        emotions.update(col_emotions)
    
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
