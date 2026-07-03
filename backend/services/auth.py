from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from config import settings
from db.database import get_db


def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


async def get_or_create_user(email: str) -> dict:
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {"email": email, "name": email.split("@")[0].capitalize(), "created_at": datetime.utcnow(), "label_count": 0}
        result = await db.users.insert_one(doc)
        user = await db.users.find_one({"_id": result.inserted_id})
    return _fmt_user(user)


async def get_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    user = await db.users.find_one({"email": email})
    return _fmt_user(user) if user else None


def _fmt_user(doc: dict) -> dict:
    """Format user document for API response, converting ObjectId to string.

    Only a computed `is_admin` boolean is exposed here - the actual admin
    email list (settings.get_admin_emails()) never leaves the backend, so
    it can't be read out of the frontend bundle or API responses.
    """
    if not doc:
        return None
    email = doc.get("email")
    return {
        "email": email,
        "name": doc.get("name"),
        "created_at": doc.get("created_at"),
        "is_admin": bool(email) and email.strip().lower() in settings.get_admin_emails(),
    }
