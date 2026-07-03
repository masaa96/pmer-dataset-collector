from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from typing import List, Dict, Optional
from pydantic import BaseModel
from config import settings
from services.data_service import (
    get_composers_summary,
    get_composer_compositions,
    get_all_composer_compositions,
    get_all_emotions,
    add_new_composer,
    add_composition_to_composer,
    add_emotions_to_composition,
    label_unlabeled_composition,
    add_youtube_link_to_composition,
    get_all_composer_names,
    add_existing_composer_to_unlabeled,
    upload_sheet_pdf,
    get_sheet_pdf,
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


class AddYoutubeLinkRequest(BaseModel):
    composer_name: str
    composition_name: str
    youtube_url: str


class AddComposerToUnlabeledRequest(BaseModel):
    composer_name: str


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


@router.get("/composers/names")
async def composer_names() -> List[str]:
    try:
        return await get_all_composer_names()
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


@router.get("/composers/{composer_name}/all-compositions")
async def composer_all_compositions(composer_name: str) -> List[Dict]:
    try:
        return await get_all_composer_compositions(composer_name)
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


@router.post("/composers/add-to-unlabeled")
async def add_composer_to_unlabeled(request: AddComposerToUnlabeledRequest, email: str = Depends(get_email)) -> Dict:
    try:
        return await add_existing_composer_to_unlabeled(request.composer_name.strip())
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


@router.post("/compositions/add-youtube-link")
async def add_youtube_link(request: AddYoutubeLinkRequest, email: str = Depends(get_email)) -> Dict:
    if email.strip().lower() not in settings.get_admin_emails():
        raise HTTPException(status_code=403, detail="Only admins can add YouTube links")
    try:
        return await add_youtube_link_to_composition(
            request.composer_name.strip(), request.composition_name.strip(), request.youtube_url.strip()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compositions/upload-sheet-pdf")
async def upload_sheet_pdf_route(
    composer_name: str = Form(...),
    composition_name: str = Form(...),
    file: UploadFile = File(...),
    email: str = Depends(get_email),
) -> Dict:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    try:
        return await upload_sheet_pdf(
            composer_name.strip(), composition_name.strip(), file.filename or "sheet.pdf", file_bytes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compositions/sheet-pdf/{file_id}")
async def download_sheet_pdf(file_id: str):
    try:
        filename, data = await get_sheet_pdf(file_id)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
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
