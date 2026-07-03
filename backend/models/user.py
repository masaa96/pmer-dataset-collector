"""
User data models.
In-memory storage for MVP (no database yet).
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """Request model for user login."""
    email: str


class UserResponse(BaseModel):
    """Response model for user data."""
    email: str
    name: Optional[str] = None
    created_at: Optional[datetime] = None
    is_admin: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Data stored in JWT token."""
    email: Optional[str] = None
