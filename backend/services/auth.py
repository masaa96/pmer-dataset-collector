"""
Authentication service.
Handles JWT token creation and validation.
In-memory user storage for MVP.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, status
from config import settings

# In-memory user storage (temporary - no database)
# Format: {email: {name: str, created_at: datetime}}
users_db: Dict[str, dict] = {}


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return email if valid."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None


def get_or_create_user(email: str) -> dict:
    """
    Get user from in-memory storage or create if doesn't exist.
    Returns user data dict.
    """
    if email not in users_db:
        # Extract name from email (before @)
        name = email.split("@")[0].capitalize()
        users_db[email] = {
            "email": email,
            "name": name,
            "created_at": datetime.utcnow()
        }
    
    return users_db[email]


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email from in-memory storage."""
    return users_db.get(email)
