"""
Data API routes.
Handles composition and composer data endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
from services.data_service import (
    get_composers_summary,
    get_composer_compositions,
    get_all_emotions,
    add_new_composer,
    add_composition_to_composer,
    add_emotions_to_composition,
    label_unlabeled_composition
)


class AddComposerRequest(BaseModel):
    composer_name: str


class AddCompositionRequest(BaseModel):
    composer_name: str
    composition_name: str
    youtube_url: Optional[str] = None


class SubmitLabelsRequest(BaseModel):
    composer_name: str
    composition_name: str
    emotions: List[str]
    is_labeled: bool  # True if composition already has labels, False if unlabeled

router = APIRouter(prefix="/api/data", tags=["Data"])


@router.get("/composers/summary")
async def composers_summary() -> Dict:
    """
    Get summary of all composers grouped by labeled/unlabeled.
    Includes composition counts for each composer.
    """
    try:
        return get_composers_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/composers/{composer_name}/compositions")
async def composer_compositions(composer_name: str) -> List[Dict]:
    """
    Get all labeled compositions for a specific composer with their emotions.
    """
    try:
        compositions = get_composer_compositions(composer_name, labeled=True)
        if not compositions:
            raise HTTPException(
                status_code=404,
                detail=f"No labeled compositions found for composer: {composer_name}"
            )
        return compositions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/composers/{composer_name}/unlabeled-compositions")
async def composer_unlabeled_compositions(composer_name: str) -> List[Dict]:
    """
    Get all unlabeled compositions for a specific composer.
    Returns empty list if composer has no compositions yet (valid for new composers).
    """
    try:
        compositions = get_composer_compositions(composer_name, labeled=False)
        # For unlabeled composers, empty list is valid (new composer with no compositions yet)
        return compositions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emotions")
async def all_emotions() -> Dict:
    """Get list of all unique emotions in the dataset."""
    try:
        emotions = get_all_emotions()
        return {"emotions": emotions, "count": len(emotions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/composers/add")
async def add_composer(request: AddComposerRequest) -> Dict:
    """
    Add a new composer to the unlabeled composers list.
    The composer is stored in a separate JSON file, not in the Excel file.
    """
    try:
        result = add_new_composer(request.composer_name.strip())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compositions/add")
async def add_composition(request: AddCompositionRequest) -> Dict:
    """
    Add a new composition to a composer in the new_composers.json file.
    Optionally includes a YouTube URL.
    """
    try:
        result = add_composition_to_composer(
            request.composer_name.strip(),
            request.composition_name.strip(),
            request.youtube_url.strip() if request.youtube_url else None
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compositions/submit-labels")
async def submit_labels(request: SubmitLabelsRequest) -> Dict:
    """
    Submit emotion labels for a composition.
    - If is_labeled=True: Adds new emotions to an already labeled composition
    - If is_labeled=False: Labels an unlabeled composition (moves from unlabeled to labeled)
    All changes go to new_composers.json, never modifying the original Excel file.
    """
    try:
        if request.is_labeled:
            # Adding emotions to an already labeled composition
            result = add_emotions_to_composition(
                request.composer_name.strip(),
                request.composition_name.strip(),
                [e.strip() for e in request.emotions]
            )
        else:
            # Labeling an unlabeled composition
            result = label_unlabeled_composition(
                request.composer_name.strip(),
                request.composition_name.strip(),
                [e.strip() for e in request.emotions]
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
