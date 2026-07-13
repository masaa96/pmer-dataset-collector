from typing import List, Dict, Optional
from datetime import datetime
import re
from bson import ObjectId
from bson.errors import InvalidId
from db.database import get_db, get_gridfs_bucket
from config import settings

_YOUTUBE_URL_RE = re.compile(
    r"^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}"
)

# MongoDB's hard per-document BSON size limit. GridFS itself has no such
# limit (it chunks large files), but we still cap uploads here to keep sheet
# music files reasonably sized for a web app.
MAX_SHEET_PDF_SIZE_BYTES = 16 * 1024 * 1024  # 16 MB


async def get_composers_summary() -> Dict:
    db = get_db()
    labeled = []
    unlabeled_counts: Dict[str, int] = {}

    # Group by composer AND labeled status separately, so a composer with a
    # mix of labeled/unlabeled compositions shows up correctly (with the
    # right counts) in both lists instead of being lumped entirely into
    # whichever status happened to come first in the cursor.
    async for doc in db.compositions.aggregate(
        [
            {"$group": {"_id": {"composer_name": "$composer_name", "labeled": "$labeled"}, "count": {"$sum": 1}}},
        ]
    ):
        name = doc["_id"]["composer_name"]
        if doc["_id"]["labeled"]:
            labeled.append({"name": name, "composition_count": doc["count"]})
        else:
            unlabeled_counts[name] = doc["count"]

    # Composers explicitly surfaced via the "Add New Composer" flow (brand
    # new composers, or existing composers - even fully-labeled ones -
    # picked from the dropdown to start adding fresh unlabeled compositions
    # for them) still show up with a 0 count. The flag is only ever cleared
    # by label_unlabeled_composition() when a composer's last unlabeled
    # composition gets labeled, so it can't get "stuck" showing a
    # fully-labeled composer that hasn't been explicitly re-added.
    async for composer in db.composers.find({"show_when_empty": True}, {"name": 1}):
        unlabeled_counts.setdefault(composer["name"], 0)

    labeled.sort(key=lambda c: c["name"])
    unlabeled = [{"name": name, "composition_count": count} for name, count in sorted(unlabeled_counts.items())]

    labeled_count = await db.compositions.count_documents({"labeled": True})
    unlabeled_count = await db.compositions.count_documents({"labeled": False})
    total = await db.compositions.count_documents({})

    return {
        "labeled": labeled,
        "unlabeled": unlabeled,
        "total_compositions": total,
        "labeled_count": labeled_count,
        "unlabeled_count": unlabeled_count,
        "collection_target": settings.collection_target,
    }


async def get_composer_compositions(composer_name: str, labeled: bool = True) -> List[Dict]:
    db = get_db()
    docs = await db.compositions.find({"composer_name": composer_name, "labeled": labeled}).to_list(None)
    return [_fmt_comp(doc) for doc in docs]


async def get_all_composer_compositions(composer_name: str) -> List[Dict]:
    """Return every composition for a composer, regardless of labeled status,
    for use in the "Add Composition" dropdown so users can tell whether a
    composition already exists (and if so, whether it's labeled)."""
    db = get_db()
    docs = await db.compositions.find({"composer_name": composer_name}).to_list(None)
    return [_fmt_comp(doc) for doc in docs]


async def get_all_emotions() -> List[str]:
    """
    Retrieve all unique emotions from both compositions and user labels.
    
    This captures:
    - Original emotions from pre-labeled compositions
    - User-submitted emotions from the labels collection
    
    This ensures the list is dynamic and includes any new emotions added by users.
    
    Returns:
        Sorted list of unique emotion strings
    """
    db = get_db()
    
    # Get emotions from original labeled compositions
    composition_emotions = await db.compositions.distinct("emotions")
    
    # Get emotions from user-submitted labels
    label_emotions = await db.labels.distinct("emotions")
    
    # Combine both, filter out None/empty, deduplicate, and sort
    all_emotions = set()
    
    for emotion_list in [composition_emotions, label_emotions]:
        for emotion in emotion_list:
            if emotion and isinstance(emotion, str):
                all_emotions.add(emotion.strip())
    
    return sorted(list(all_emotions))


async def add_new_composer(composer_name: str) -> Dict:
    db = get_db()
    if await db.composers.find_one({"name": composer_name}):
        raise ValueError(f"Composer '{composer_name}' already exists")
    await db.composers.insert_one(
        {
            "name": composer_name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            # New composers should be immediately visible on the Unlabeled
            # Composers page (with 0 compositions) even before any
            # composition has been added for them.
            "show_when_empty": True,
        }
    )
    return {"success": True, "message": f"Added composer '{composer_name}'"}


async def get_all_composer_names() -> List[str]:
    db = get_db()
    names = await db.composers.distinct("name")
    return sorted(names)


async def add_existing_composer_to_unlabeled(composer_name: str) -> Dict:
    """Ensure an already-registered composer (e.g. one whose compositions are
    all labeled) is surfaced on the Unlabeled Composers page with a 0 count,
    so users can start adding unlabeled compositions for them."""
    db = get_db()
    composer = await db.composers.find_one({"name": composer_name})
    if not composer:
        raise ValueError(f"Composer '{composer_name}' not found")
    await db.composers.update_one(
        {"_id": composer["_id"]},
        {"$set": {"show_when_empty": True, "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "message": f"'{composer_name}' added to unlabeled composers list"}


async def add_youtube_link_to_composition(composer_name: str, composition_name: str, youtube_url: str) -> Dict:
    """Set the YouTube link for a composition that doesn't have one yet.

    Restricted to admins at the route level; this function additionally
    guards against overwriting an existing link and validates the URL
    format before persisting it to MongoDB.
    """
    if not youtube_url or not _YOUTUBE_URL_RE.match(youtube_url):
        raise ValueError("Please provide a valid YouTube URL")

    db = get_db()
    comp = await db.compositions.find_one({"composer_name": composer_name, "name": composition_name})
    if not comp:
        raise ValueError(f"Composition '{composition_name}' not found")
    if comp.get("youtube_url"):
        raise ValueError("This composition already has a YouTube link")

    await db.compositions.update_one(
        {"_id": comp["_id"]},
        {"$set": {"youtube_url": youtube_url, "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "message": "YouTube link added successfully", "youtube_url": youtube_url}


async def add_composition_to_composer(composer_name: str, composition_name: str, youtube_url: Optional[str] = None) -> Dict:
    db = get_db()
    composer = await db.composers.find_one({"name": composer_name})
    if not composer:
        raise ValueError(f"Composer '{composer_name}' not found")
    if await db.compositions.find_one({"composer_id": composer["_id"], "name": composition_name}):
        raise ValueError(f"Composition '{composition_name}' already exists")
    await db.compositions.insert_one(
        {
            "name": composition_name,
            "composer_id": composer["_id"],
            "composer_name": composer_name,
            "labeled": False,
            "emotions": [],
            "youtube_url": youtube_url,
            "sheet_pdf_id": None,
            "sheet_pdf_filename": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
    )
    return {"success": True, "message": f"Added composition '{composition_name}'"}


async def label_unlabeled_composition(composer_name: str, composition_name: str, emotions: List[str], user_email: str) -> Dict:
    db = get_db()
    if not emotions:
        raise ValueError("At least one emotion must be provided")

    comp = await db.compositions.find_one({"composer_name": composer_name, "name": composition_name})
    if not comp:
        raise ValueError(f"Composition '{composition_name}' not found")

    if comp["labeled"]:
        raise ValueError(f"Composition '{composition_name}' is already labeled")

    await db.compositions.update_one({"_id": comp["_id"]}, {"$set": {"labeled": True, "emotions": emotions, "updated_at": datetime.utcnow()}})

    # If that was this composer's last unlabeled composition, clear the
    # "show_when_empty" placeholder flag so they no longer show up on the
    # Unlabeled Composers page with a 0 count - they've effectively moved
    # over to the Labeled Composers page.
    remaining_unlabeled = await db.compositions.count_documents({"composer_name": composer_name, "labeled": False})
    if remaining_unlabeled == 0:
        await db.composers.update_one(
            {"name": composer_name},
            {"$set": {"show_when_empty": False, "updated_at": datetime.utcnow()}},
        )

    user = await db.users.find_one({"email": user_email})
    await db.labels.insert_one(
        {"composition_id": comp["_id"], "composition_name": composition_name, "composer_name": composer_name, "user_id": user["_id"], "user_email": user_email, "emotions": emotions, "submitted_at": datetime.utcnow()}
    )

    if user:
        await db.users.update_one({"_id": user["_id"]}, {"$inc": {"label_count": 1}})

    return {"success": True, "message": f"Labeled '{composition_name}' with {len(emotions)} emotion(s)"}


async def add_emotions_to_composition(composer_name: str, composition_name: str, emotions: List[str], user_email: str) -> Dict:
    db = get_db()
    if not emotions:
        raise ValueError("At least one emotion must be provided")

    comp = await db.compositions.find_one({"composer_name": composer_name, "name": composition_name})
    if not comp:
        raise ValueError(f"Composition '{composition_name}' not found")

    existing = set(comp.get("emotions", []))
    new_emotions = [e for e in emotions if e not in existing]
    merged = list(existing | set(emotions))

    await db.compositions.update_one({"_id": comp["_id"]}, {"$set": {"emotions": merged, "updated_at": datetime.utcnow()}})

    user = await db.users.find_one({"email": user_email})
    await db.labels.insert_one(
        {"composition_id": comp["_id"], "composition_name": composition_name, "composer_name": composer_name, "user_id": user["_id"], "user_email": user_email, "emotions": emotions, "submitted_at": datetime.utcnow()}
    )

    return {"success": True, "message": f"Added {len(new_emotions)} new emotion(s) to '{composition_name}'"}


def _fmt_comp(doc: dict) -> dict:
    return {
        "_id": str(doc.get("_id")),
        "name": doc.get("name"),
        "composer_id": str(doc.get("composer_id")),
        "labeled": doc.get("labeled"),
        "emotions": doc.get("emotions", []),
        "youtube_url": doc.get("youtube_url"),
        "sheet_pdf_id": str(doc["sheet_pdf_id"]) if doc.get("sheet_pdf_id") else None,
        "sheet_pdf_filename": doc.get("sheet_pdf_filename"),
    }


async def upload_sheet_pdf(composer_name: str, composition_name: str, filename: str, file_bytes: bytes) -> Dict:
    """Store a sheet music PDF for a composition in GridFS and link it from
    the composition document. Only one PDF is allowed per composition."""
    if not file_bytes:
        raise ValueError("The uploaded file is empty")
    if len(file_bytes) > MAX_SHEET_PDF_SIZE_BYTES:
        raise ValueError("PDF file is too large. Maximum allowed size is 16 MB")
    # Validate both the extension and the actual file signature ("%PDF-")
    # so a renamed non-PDF file can't be uploaded.
    if not filename.lower().endswith(".pdf") or not file_bytes.startswith(b"%PDF-"):
        raise ValueError("Please upload a valid PDF file")

    db = get_db()
    comp = await db.compositions.find_one({"composer_name": composer_name, "name": composition_name})
    if not comp:
        raise ValueError(f"Composition '{composition_name}' not found")
    if comp.get("sheet_pdf_id"):
        raise ValueError("This composition already has a sheet music PDF")

    bucket = get_gridfs_bucket()
    file_id = await bucket.upload_from_stream(
        filename,
        file_bytes,
        metadata={"composer_name": composer_name, "composition_name": composition_name, "content_type": "application/pdf"},
    )

    await db.compositions.update_one(
        {"_id": comp["_id"]},
        {"$set": {"sheet_pdf_id": file_id, "sheet_pdf_filename": filename, "updated_at": datetime.utcnow()}},
    )
    return {
        "success": True,
        "message": "Sheet music PDF uploaded successfully",
        "sheet_pdf_id": str(file_id),
        "sheet_pdf_filename": filename,
    }


async def get_sheet_pdf(file_id: str):
    """Return (filename, bytes) for a stored sheet music PDF."""
    try:
        oid = ObjectId(file_id)
    except (InvalidId, TypeError):
        raise ValueError("Invalid file id")

    bucket = get_gridfs_bucket()
    try:
        grid_out = await bucket.open_download_stream(oid)
        data = await grid_out.read()
    except Exception:
        raise ValueError("Sheet music PDF not found")
    return grid_out.filename or "sheet.pdf", data


async def delete_sheet_pdf(composer_name: str, composition_name: str) -> Dict:
    """Remove a composition's sheet music PDF from GridFS and clear the
    linked fields on the composition document, so the UI never keeps
    pointing at a file that no longer exists."""
    db = get_db()
    comp = await db.compositions.find_one({"composer_name": composer_name, "name": composition_name})
    if not comp:
        raise ValueError(f"Composition '{composition_name}' not found")
    if not comp.get("sheet_pdf_id"):
        raise ValueError("This composition has no sheet music PDF")

    bucket = get_gridfs_bucket()
    try:
        await bucket.delete(comp["sheet_pdf_id"])
    except Exception:
        # The GridFS file may already be gone (e.g. removed directly in the
        # database) - still clear the stale reference below so the UI stops
        # pointing at a missing file.
        pass

    await db.compositions.update_one(
        {"_id": comp["_id"]},
        {"$set": {"sheet_pdf_id": None, "sheet_pdf_filename": None, "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "message": "Sheet music PDF removed successfully"}
