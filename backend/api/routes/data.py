from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Optional
from pydantic import BaseModel
from services.data_service import (
    get_composers_summary,
    get_composer_compositions,
    get_all_emotions,
    add_new_composer,
    add_composition_to_composer,
    add_emotions_to_composition,
    label_unlabeled_composition,
)
from services.auth import verify_token, get_user_by_email

router = APIRouter(prefix="/api/data", tags=["Data"])
security = HTTPBearer()


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
    is_labeled: bool


async def get_email(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    email = verify_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    return email


@router.get("/composers/summary")
async def composers_summary() -> Dict:
    try:
        return await get_composers_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/composers/{composer_name}/compositions")
async def composer_compositions(composer_name: str) -> List[Dict]:
    try:
        compositions = await get_composer_compositions(composer_name, labeled=True)
        if not compositions:
            raise HTTPException(status_code=404, detail=f"No labeled compositions found for: {composer_name}")
        return compositions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/composers/{composer_name}/unlabeled-compositions")
async def composer_unlabeled_compositions(composer_name: str) -> List[Dict]:
    try:
        return await get_composer_compositions(composer_name, labeled=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emotions")
async def all_emotions() -> Dict:
    try:
        emotions = await get_all_emotions()
        return {"emotions": emotions, "count": len(emotions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/composers/add")
async def add_composer(request: AddComposerRequest, email: str = Depends(get_email)) -> Dict:
    try:
        return await add_new_composer(request.composer_name.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compositions/add")
async def add_composition(request: AddCompositionRequest, email: str = Depends(get_email)) -> Dict:
    try:
        return await add_composition_to_composer(request.composer_name.strip(), request.composition_name.strip(), request.youtube_url.strip() if request.youtube_url else None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compositions/submit-labels")
async def submit_labels(request: SubmitLabelsRequest, email: str = Depends(get_email)) -> Dict:
    try:
        if request.is_labeled:
            return await add_emotions_to_composition(request.composer_name.strip(), request.composition_name.strip(), [e.strip() for e in request.emotions], email)
        else:
            return await label_unlabeled_composition(request.composer_name.strip(), request.composition_name.strip(), [e.strip() for e in request.emotions], email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
