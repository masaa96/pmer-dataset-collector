"""
Authentication API routes.
Handles user login and authentication.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.user import UserLogin, Token, UserResponse
from services.auth import create_access_token, verify_token, get_or_create_user, get_user_by_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """
    Login or register a user with email.
    Creates a new user if email doesn't exist.
    Returns JWT token for authentication.
    """
    # Get or create user
    user_data = get_or_create_user(user_login.email)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data["email"]})
    
    # Return token and user data
    return Token(
        access_token=access_token,
        user=UserResponse(**user_data)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current authenticated user from JWT token.
    """
    token = credentials.credentials
    email = verify_token(token)
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = get_user_by_email(email)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user_data)
