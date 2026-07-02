from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId
from db.database import get_db
from config import settings


async def get_composers_summary() -> Dict:
    db = get_db()
    labeled = []
    unlabeled = []

    async for doc in db.compositions.aggregate(
        [{"$group": {"_id": "$composer_name", "count": {"$sum": 1}, "labeled": {"$first": "$labeled"}}}, {"$sort": {"_id": 1}}]
    ):
        entry = {"name": doc["_id"], "composition_count": doc["count"]}
        (labeled if doc["labeled"] else unlabeled).append(entry)

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
    await db.composers.insert_one({"name": composer_name, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()})
    return {"success": True, "message": f"Added composer '{composer_name}'"}


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
    return {"_id": str(doc.get("_id")), "name": doc.get("name"), "composer_id": str(doc.get("composer_id")), "labeled": doc.get("labeled"), "emotions": doc.get("emotions", []), "youtube_url": doc.get("youtube_url")}
