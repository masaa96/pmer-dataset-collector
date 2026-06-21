# PMER Dataset Collector - Project Architecture (FastAPI Edition)

## Executive Summary

This document outlines the architecture for a web application designed to collect emotional labeling data for classical music compositions for your master thesis. This architecture uses **Python FastAPI** for the backend, optimized for rapid development, data science integration, and excellent documentation.

**Goal**: Collect 1000 labeled compositions (currently at 150/1000)

---

## 🎯 Core Architectural Principles (Read First!)

Before diving into implementation, understand these **5 critical architectural decisions** that will guide your entire project:

### 1. **Separation of Concerns (Layered Architecture)**
Your app should be divided into distinct layers, each with a single responsibility:
- **Presentation Layer** (Frontend): User interface, routing, state management
- **API Layer** (Backend): HTTP endpoints, request/response handling
- **Business Logic Layer**: Core application rules and workflows
- **Data Access Layer**: Database operations and queries
- **Data Model Layer**: Database schemas and validation

**Why?** Makes code maintainable, testable, and allows changing one layer without breaking others.

### 2. **Single Source of Truth (SSOT)**
One canonical place for each piece of data:
- Database holds the truth
- Frontend caches it temporarily
- Backend validates and syncs it
- Progress count is computed, not stored separately

**Why?** Prevents data inconsistency, reduces bugs, simplifies debugging.

### 3. **API-First Design**
Design your API contract before implementation:
- Define all endpoints, request/response schemas
- Document expected behavior
- Frontend and backend teams (or you!) can work in parallel
- Use OpenAPI/Swagger for documentation

**Why?** Clear contracts prevent miscommunication, enable testing, auto-generate client code.

### 4. **Stateless Backend + Stateful Database**
Backend servers don't remember previous requests (stateless):
- Authentication via tokens (JWT), not sessions
- All state lives in database or client
- Any server can handle any request

**Why?** Easy to scale horizontally (add more servers), simple deployment, no server memory issues.

### 5. **Progressive Enhancement for Data Collection**
Start simple, add complexity only when needed:
- **Phase 1**: Core CRUD + labeling (your MVP)
- **Phase 2**: User analytics, export
- **Phase 3**: ML-powered recommendations, quality control

**Why?** Ship faster, validate assumptions, avoid over-engineering.

---

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Context API + TanStack Query (React Query v5)
- **Routing**: React Router v6
- **UI Framework**: Material-UI (MUI) v5 or Chakra UI (recommended for simplicity)
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod validation

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI 0.104+ (async-first web framework)
- **ORM**: Beanie (async MongoDB ODM) or Motor (async MongoDB driver)
- **Authentication**: FastAPI Security + PyJWT
- **Validation**: Pydantic v2 (built into FastAPI)
- **API Documentation**: Automatic OpenAPI/Swagger (built-in)
- **Testing**: Pytest + HTTPX (async client)

### Database
- **Primary Database**: MongoDB Atlas (AWS-hosted)
  - **Why MongoDB?**
    - Flexible schema for adding new emotions dynamically
    - Easy to handle nested structures (composers → compositions → emotions)
    - Native JSON support
    - MongoDB Atlas integrates seamlessly with AWS
    - Great for rapid development and schema evolution
    - Perfect for research data that may change structure
  - **Alternative**: PostgreSQL if you prefer relational (see section below)

### AWS Infrastructure
- **Frontend Hosting**: 
  - S3 (static file hosting) + CloudFront (CDN)
  - Alternative: AWS Amplify Hosting (easier setup)
- **Backend Hosting**: 
  - **Option 1**: AWS App Runner (easiest - container-based, auto-scaling)
  - **Option 2**: Elastic Beanstalk with Python
  - **Option 3**: ECS with Fargate (containerized)
  - **Option 4**: EC2 with Docker Compose (manual but cheap)
- **Database**: MongoDB Atlas (cloud-hosted, select AWS region)
- **Media**: YouTube embeds (no storage needed)
- **Domain/SSL**: Route 53 + Certificate Manager

---

## Authentication Strategy

### Recommendation: **Simple Email-Based Authentication (No Password)**

For an open academic research application, use the simplest secure approach:

#### **Option A: Magic Link Authentication (Recommended)**
```python
# User flow:
1. User enters email on login page
2. Backend generates unique token, stores in DB with expiration
3. Email sent with link: https://app.com/verify?token=abc123
4. User clicks link, backend validates token
5. Backend returns JWT for subsequent requests
6. User is logged in for 30 days
```

**Advantages**:
- No password to remember or manage
- No password reset flow needed
- More secure (no password leaks)
- Lower barrier to entry = more participants
- Still tracks individual contributions

#### **Option B: OAuth (Google/GitHub)**
```python
# Integration with python-social-auth or Authlib
- One-click login
- No email infrastructure needed
- Even easier for users
```

#### **Option C: Simple Email + Password**
```python
# If you need traditional auth:
- Use passlib with bcrypt for hashing
- Add password reset flow
- More work but familiar to users
```

### Implemented Strategy: Magic Link

**Why?** Perfect for research apps:
- Users won't forget credentials
- You still know who labeled what (for data quality)
- Prevents spam/duplicates
- GDPR-friendly (minimal PII)
- No password security risks

---

## Database Schema Design (MongoDB + Beanie ODM)

### Why Beanie ODM?
- Type-safe Pydantic models for MongoDB
- Async/await support (fast!)
- Automatic validation
- Easy migrations
- Great IDE support with type hints

### Collections & Schemas

#### 1. **users** Collection
```python
from beanie import Document
from pydantic import EmailStr
from datetime import datetime
from typing import Optional

class User(Document):
    username: str
    email: EmailStr
    created_at: datetime = datetime.utcnow()
    last_login: Optional[datetime] = None
    contribution_count: int = 0
    
    class Settings:
        name = "users"
        indexes = [
            "email",  # Unique index for fast lookup
            "username",
        ]
```

#### 2. **composers** Collection
```python
from beanie import Document, Link
from datetime import datetime
from typing import Optional

class Composer(Document):
    name: str
    birth_year: Optional[int] = None
    death_year: Optional[int] = None
    period: Optional[str] = None  # "Baroque", "Classical", "Romantic", etc.
    added_by: Link[User]
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "composers"
        indexes = [
            "name",  # For search/filtering
        ]
```

#### 3. **compositions** Collection
```python
from beanie import Document, Link
from pydantic import HttpUrl
from datetime import datetime
from typing import Optional

class Composition(Document):
    composer: Link[Composer]
    title: str
    opus: Optional[str] = None
    number: Optional[str] = None
    youtube_url: HttpUrl
    youtube_id: str  # Extracted from URL
    added_by: Link[User]
    created_at: datetime = datetime.utcnow()
    
    # Computed fields (updated via backend logic)
    is_labeled: bool = False  # True if has at least 1 label
    label_count: int = 0  # Number of unique emotions labeled
    
    class Settings:
        name = "compositions"
        indexes = [
            "composer",
            "is_labeled",  # Fast filtering
            [("composer", 1), ("is_labeled", 1)],  # Compound index
        ]
```

#### 4. **emotions** Collection
```python
from beanie import Document, Link
from datetime import datetime
from typing import Optional

class Emotion(Document):
    name: str  # "Joy", "Sadness", "Anger", etc.
    category: Optional[str] = None  # "positive", "negative", "neutral"
    added_by: Link[User]
    usage_count: int = 0  # How many times used across all compositions
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "emotions"
        indexes = [
            "name",  # Unique index
        ]
```

#### 5. **labels** Collection (Join table)
```python
from beanie import Document, Link
from datetime import datetime

class Label(Document):
    composition: Link[Composition]
    emotion: Link[Emotion]
    user: Link[User]
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "labels"
        indexes = [
            "composition",
            "emotion",
            "user",
            [("composition", 1), ("emotion", 1), ("user", 1)],  # Prevent duplicates
        ]
```

#### 6. **magic_tokens** Collection (For authentication)
```python
from beanie import Document, Link
from datetime import datetime, timedelta
from typing import Optional

class MagicToken(Document):
    token: str
    email: str
    user: Optional[Link[User]] = None
    expires_at: datetime
    used_at: Optional[datetime] = None
    is_used: bool = False
    
    class Settings:
        name = "magic_tokens"
        indexes = [
            "token",  # Unique
            "email",
            "expires_at",  # For cleanup
        ]
```

---

## FastAPI Project Structure (Clean Architecture)

```
pmer-dataset-collector/
├── frontend/                        # React application
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── TabNavigation.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   └── youtube/
│   │   │       └── YouTubeEmbed.tsx
│   │   ├── pages/                   # Route components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── VerifyPage.tsx       # Magic link verification
│   │   │   ├── HomePage.tsx
│   │   │   ├── labeled/
│   │   │   │   ├── LabeledComposersPage.tsx
│   │   │   │   ├── LabeledCompositionsPage.tsx
│   │   │   │   └── CompositionDetailPage.tsx
│   │   │   └── unlabeled/
│   │   │       ├── UnlabeledComposersPage.tsx
│   │   │       ├── UnlabeledCompositionsPage.tsx
│   │   │       └── CompositionLabelPage.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useProgress.ts
│   │   │   ├── useComposers.ts
│   │   │   ├── useCompositions.ts
│   │   │   └── useLabels.ts
│   │   ├── services/                # API client layer
│   │   │   ├── api.ts               # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── composer.service.ts
│   │   │   ├── composition.service.ts
│   │   │   ├── emotion.service.ts
│   │   │   └── label.service.ts
│   │   ├── context/                 # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── ProgressContext.tsx
│   │   ├── types/                   # TypeScript types
│   │   │   ├── models.ts            # Match backend schemas
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── youtube.ts
│   │   │   └── formatters.ts
│   │   ├── constants/
│   │   │   └── routes.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles/
│   │       └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app initialization
│   │   │
│   │   ├── api/                     # API layer
│   │   │   ├── __init__.py
│   │   │   ├── deps.py              # Dependency injection (get current user, etc.)
│   │   │   ├── v1/                  # API version 1
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py        # Main API router
│   │   │   │   └── endpoints/
│   │   │   │       ├── __init__.py
│   │   │   │       ├── auth.py      # Authentication endpoints
│   │   │   │       ├── composers.py
│   │   │   │       ├── compositions.py
│   │   │   │       ├── emotions.py
│   │   │   │       ├── labels.py
│   │   │   │       └── progress.py
│   │   │   │
│   │   ├── core/                    # Core configuration
│   │   │   ├── __init__.py
│   │   │   ├── config.py            # Settings (from env vars)
│   │   │   ├── security.py          # JWT creation, password hashing
│   │   │   └── database.py          # MongoDB connection
│   │   │
│   │   ├── models/                  # Database models (Beanie)
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── composer.py
│   │   │   ├── composition.py
│   │   │   ├── emotion.py
│   │   │   ├── label.py
│   │   │   └── magic_token.py
│   │   │
│   │   ├── schemas/                 # Pydantic schemas (API contracts)
│   │   │   ├── __init__.py
│   │   │   ├── user.py              # UserCreate, UserResponse, etc.
│   │   │   ├── composer.py          # ComposerCreate, ComposerResponse
│   │   │   ├── composition.py
│   │   │   ├── emotion.py
│   │   │   ├── label.py
│   │   │   ├── auth.py              # LoginRequest, TokenResponse
│   │   │   └── common.py            # Shared schemas (pagination, etc.)
│   │   │
│   │   ├── services/                # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py      # Magic link generation, verification
│   │   │   ├── composer_service.py  # Business logic for composers
│   │   │   ├── composition_service.py
│   │   │   ├── emotion_service.py
│   │   │   ├── label_service.py     # Core labeling logic
│   │   │   ├── progress_service.py  # Calculate progress
│   │   │   └── email_service.py     # Send emails (magic links)
│   │   │
│   │   ├── crud/                    # Data access layer (CRUD operations)
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Generic CRUD class
│   │   │   ├── user.py
│   │   │   ├── composer.py
│   │   │   ├── composition.py
│   │   │   ├── emotion.py
│   │   │   └── label.py
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── youtube.py           # Extract YouTube ID
│   │   │   ├── validators.py        # Custom validators
│   │   │   └── email.py             # Email templates
│   │   │
│   │   └── middleware/              # Custom middleware
│   │       ├── __init__.py
│   │       ├── cors.py
│   │       └── rate_limit.py
│   │
│   ├── tests/                       # Test suite
│   │   ├── __init__.py
│   │   ├── conftest.py              # Pytest fixtures
│   │   ├── unit/
│   │   │   ├── test_services.py
│   │   │   └── test_utils.py
│   │   └── integration/
│   │       ├── test_auth.py
│   │       ├── test_compositions.py
│   │       └── test_labeling.py
│   │
│   ├── alembic/                     # Database migrations (optional)
│   │   └── versions/
│   │
│   ├── scripts/                     # Utility scripts
│   │   ├── init_db.py               # Create indexes, seed data
│   │   ├── import_data.py           # Import your existing 150 compositions
│   │   └── export_data.py           # Export labeled data for analysis
│   │
│   ├── requirements.txt             # Production dependencies
│   ├── requirements-dev.txt         # Development dependencies
│   ├── pyproject.toml               # Modern Python project config
│   ├── .env.example
│   └── README.md
│
├── infrastructure/                  # Deployment configuration
│   ├── docker/
│   │   ├── Dockerfile.frontend
│   │   ├── Dockerfile.backend
│   │   └── docker-compose.yml       # Local development
│   ├── aws/
│   │   ├── cloudformation/
│   │   │   └── template.yaml
│   │   └── scripts/
│   │       ├── deploy-frontend.sh
│   │       └── deploy-backend.sh
│   └── nginx/
│       └── nginx.conf               # Reverse proxy config
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # This file
│   ├── DEPLOYMENT.md                # Deployment guide
│   ├── DEVELOPMENT.md               # Local development setup
│   └── DATA_MODEL.md                # Database schema details
│
├── .gitignore
├── README.md
├── PROJECT_ARCHITECTURE.md
└── docker-compose.yml               # For local development
```

---

## Core Backend Code Examples

### 1. **main.py** - FastAPI Application Setup
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="PMER Dataset Collector API",
    description="API for collecting emotional labels for classical music compositions",
    version="1.0.0",
    docs_url="/api/docs",  # Swagger UI
    redoc_url="/api/redoc",  # ReDoc
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 2. **core/config.py** - Configuration Management
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "PMER Dataset Collector"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str  # Generate with: openssl rand -hex 32
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    
    # Database
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "pmer_collector"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Email (for magic links)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Goal
    TARGET_COMPOSITIONS: int = 1000
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 3. **services/label_service.py** - Core Business Logic
```python
from typing import List
from beanie import PydanticObjectId
from datetime import datetime

from app.models.label import Label
from app.models.composition import Composition
from app.models.emotion import Emotion
from app.models.user import User
from app.services.progress_service import update_composition_status

class LabelService:
    """Service for handling composition labeling logic"""
    
    @staticmethod
    async def add_labels(
        composition_id: PydanticObjectId,
        emotion_ids: List[PydanticObjectId],
        user_id: PydanticObjectId
    ) -> List[Label]:
        """
        Add emotion labels to a composition.
        Handles the critical transition from unlabeled to labeled.
        """
        # Get composition
        composition = await Composition.get(composition_id)
        if not composition:
            raise ValueError("Composition not found")
        
        # Check if this is the first label (unlabeled -> labeled transition)
        was_unlabeled = not composition.is_labeled
        
        # Create labels
        labels = []
        for emotion_id in emotion_ids:
            # Check if emotion exists
            emotion = await Emotion.get(emotion_id)
            if not emotion:
                continue
            
            # Check if label already exists (prevent duplicates)
            existing = await Label.find_one(
                Label.composition.id == composition_id,
                Label.emotion.id == emotion_id,
                Label.user.id == user_id
            )
            
            if not existing:
                label = Label(
                    composition=composition,
                    emotion=emotion,
                    user=user_id,
                    created_at=datetime.utcnow()
                )
                await label.insert()
                labels.append(label)
                
                # Update emotion usage count
                emotion.usage_count += 1
                await emotion.save()
        
        # Update composition status
        if was_unlabeled and len(labels) > 0:
            await update_composition_status(composition_id, is_labeled=True)
        
        # Update label count
        total_labels = await Label.find(
            Label.composition.id == composition_id
        ).count()
        composition.label_count = total_labels
        await composition.save()
        
        return labels
    
    @staticmethod
    async def get_composition_labels(
        composition_id: PydanticObjectId
    ) -> List[dict]:
        """Get all emotion labels for a composition with emotion details"""
        labels = await Label.find(
            Label.composition.id == composition_id
        ).to_list()
        
        # Fetch emotions and format response
        result = []
        emotion_ids = set()
        for label in labels:
            if label.emotion.id not in emotion_ids:
                emotion = await label.emotion.fetch()
                result.append({
                    "emotion_id": str(emotion.id),
                    "emotion_name": emotion.name,
                    "category": emotion.category,
                    "labeled_by_count": await Label.find(
                        Label.composition.id == composition_id,
                        Label.emotion.id == emotion.id
                    ).count()
                })
                emotion_ids.add(label.emotion.id)
        
        return result
```

### 4. **api/v1/endpoints/labels.py** - API Endpoint
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.label import LabelCreate, LabelResponse
from app.services.label_service import LabelService

router = APIRouter()

@router.post("/", response_model=List[LabelResponse])
async def add_labels(
    label_data: LabelCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add emotion labels to a composition.
    
    - **composition_id**: ID of the composition to label
    - **emotion_ids**: List of emotion IDs to assign
    
    Returns the created labels.
    
    **Important**: When an unlabeled composition receives its first label,
    it automatically moves from the unlabeled to labeled category.
    """
    try:
        labels = await LabelService.add_labels(
            composition_id=label_data.composition_id,
            emotion_ids=label_data.emotion_ids,
            user_id=current_user.id
        )
        return labels
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add labels: {str(e)}"
        )

@router.get("/composition/{composition_id}", response_model=List[dict])
async def get_composition_labels(
    composition_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """
    Get all emotion labels for a specific composition.
    Returns unique emotions with count of how many users labeled each.
    """
    return await LabelService.get_composition_labels(composition_id)
```

---

## API Endpoints Design (FastAPI Auto-Generated Docs)

FastAPI automatically generates interactive API documentation at `/api/docs` (Swagger UI) and `/api/redoc` (ReDoc).

### Authentication (`/api/v1/auth`)
```python
POST   /auth/login                   # Send magic link to email
GET    /auth/verify?token=xxx        # Verify magic link token
GET    /auth/me                      # Get current user info
POST   /auth/logout                  # Logout (invalidate token)
```

### Progress (`/api/v1/progress`)
```python
GET    /progress                     # Get global progress stats
# Response: {labeled: 150, total: 1000, percentage: 15.0}
```

### Composers (`/api/v1/composers`)
```python
GET    /composers                              # List all composers
GET    /composers/{id}                         # Get single composer
POST   /composers                              # Create new composer
GET    /composers/{id}/compositions            # Get composer's compositions
GET    /composers/labeled                      # Get composers with labeled works
GET    /composers/unlabeled                    # Get composers without labels
```

### Compositions (`/api/v1/compositions`)
```python
GET    /compositions                           # List all (with filters)
GET    /compositions/{id}                      # Get single composition
POST   /compositions                           # Create new composition
PATCH  /compositions/{id}                      # Update composition
GET    /compositions?is_labeled=true           # Filter by labeled status
GET    /compositions?composer_id=xxx           # Filter by composer
```

### Emotions (`/api/v1/emotions`)
```python
GET    /emotions                               # List all emotions
GET    /emotions/{id}                          # Get single emotion
POST   /emotions                               # Create new emotion
```

### Labels (`/api/v1/labels`)
```python
POST   /labels                                 # Add labels to composition
GET    /labels/composition/{composition_id}    # Get composition labels
DELETE /labels/{id}                            # Remove label (admin only)
```

**Example Request: Add Labels**
```json
POST /api/v1/labels
{
  "composition_id": "64abc123...",
  "emotion_ids": ["64def456...", "64ghi789..."]
}
```

---

## Critical Data Flow: Unlabeled → Labeled Transition

This is the **most important business logic** in your application.

### The Transition Rule
```python
# A composition is "labeled" when it has at least 1 emotion label
# Once labeled, it NEVER goes back to unlabeled (data integrity)

def should_move_to_labeled(composition: Composition) -> bool:
    return composition.label_count > 0
```

### Backend Implementation Flow
```python
async def add_labels_workflow(
    composition_id: str,
    emotion_ids: List[str],
    user_id: str
) -> dict:
    """
    Complete workflow for adding labels with state transition.
    """
    # 1. Get composition current state
    composition = await Composition.get(composition_id)
    was_unlabeled = not composition.is_labeled
    
    # 2. Add labels (atomic operation)
    new_labels = []
    for emotion_id in emotion_ids:
        label = await Label.create(
            composition=composition,
            emotion=emotion_id,
            user=user_id
        )
        new_labels.append(label)
    
    # 3. Update composition status (critical!)
    if was_unlabeled and len(new_labels) > 0:
        composition.is_labeled = True  # ← THE TRANSITION
        composition.label_count = len(new_labels)
        await composition.save()
        
        # 4. Trigger side effects
        await update_progress_count()  # +1 to labeled count
        await notify_user_achievement(user_id)  # Optional
    
    return {
        "success": True,
        "transitioned": was_unlabeled,
        "new_progress": await get_progress()
    }
```

### Frontend State Management
```typescript
// React Query mutation
const labelCompositionMutation = useMutation({
  mutationFn: (data: { compositionId: string; emotionIds: string[] }) =>
    api.post('/labels', data),
  
  onSuccess: (response) => {
    // If composition transitioned from unlabeled to labeled
    if (response.data.transitioned) {
      // Remove from unlabeled cache
      queryClient.setQueryData(['unlabeled-compositions'], (old) =>
        old.filter(c => c.id !== response.data.composition_id)
      );
      
      // Add to labeled cache
      queryClient.invalidateQueries(['labeled-compositions']);
      
      // Update progress bar
      queryClient.invalidateQueries(['progress']);
      
      // Show success message
      toast.success('🎉 New composition labeled! Progress updated.');
    }
  }
});
```

---

## Key Features Implementation Details

### 1. Progress Bar (Real-Time Updates)

**Backend Service:**
```python
# app/services/progress_service.py
class ProgressService:
    @staticmethod
    async def get_progress() -> dict:
        """Calculate real-time progress"""
        labeled_count = await Composition.find(
            Composition.is_labeled == True
        ).count()
        
        total_count = await Composition.count()
        
        return {
            "labeled": labeled_count,
            "total": total_count,
            "goal": settings.TARGET_COMPOSITIONS,  # 1000
            "percentage": (labeled_count / settings.TARGET_COMPOSITIONS) * 100,
            "remaining": settings.TARGET_COMPOSITIONS - labeled_count
        }
```

**Frontend Component:**
```tsx
// src/components/common/ProgressBar.tsx
export const ProgressBar = () => {
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get('/progress').then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
      <span>{progress.labeled} / {progress.goal} compositions labeled</span>
    </div>
  );
};
```

### 2. Matrix View (Composers/Compositions Grid)

**Backend Endpoint:**
```python
@router.get("/composers/unlabeled")
async def get_unlabeled_composers(
    current_user: User = Depends(get_current_user)
):
    """Get composers that have unlabeled compositions"""
    pipeline = [
        # Lookup compositions for each composer
        {
            "$lookup": {
                "from": "compositions",
                "localField": "_id",
                "foreignField": "composer.$id",
                "as": "compositions"
            }
        },
        # Filter to only composers with unlabeled works
        {
            "$match": {
                "compositions": {
                    "$elemMatch": {"is_labeled": False}
                }
            }
        },
        # Count unlabeled compositions
        {
            "$project": {
                "name": 1,
                "period": 1,
                "unlabeled_count": {
                    "$size": {
                        "$filter": {
                            "input": "$compositions",
                            "as": "comp",
                            "cond": {"$eq": ["$$comp.is_labeled", False]}
                        }
                    }
                }
            }
        }
    ]
    
    return await Composer.aggregate(pipeline).to_list()
```

**Frontend Grid:**
```tsx
// src/pages/unlabeled/UnlabeledComposersPage.tsx
export const UnlabeledComposersPage = () => {
  const { data: composers } = useQuery({
    queryKey: ['unlabeled-composers'],
    queryFn: () => api.get('/composers/unlabeled').then(res => res.data)
  });
  
  return (
    <div className="composer-grid">
      {composers?.map(composer => (
        <ComposerCard
          key={composer.id}
          name={composer.name}
          unlabeledCount={composer.unlabeled_count}
          onClick={() => navigate(`/unlabeled/${composer.id}`)}
        />
      ))}
      <AddComposerButton /> {/* "+" button */}
    </div>
  );
};
```

### 3. YouTube Embed

**Python Utility:**
```python
# app/utils/youtube.py
import re
from fastapi import HTTPException

def extract_youtube_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)',
        r'youtube\.com\/embed\/([^&\s]+)',
        r'youtube\.com\/v\/([^&\s]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    raise HTTPException(
        status_code=400,
        detail="Invalid YouTube URL"
    )

def validate_youtube_url(url: str) -> bool:
    """Validate YouTube URL format"""
    try:
        extract_youtube_id(url)
        return True
    except HTTPException:
        return False
```

**React Component:**
```tsx
// src/components/youtube/YouTubeEmbed.tsx
interface Props {
  videoId: string;
  title: string;
}

export const YouTubeEmbed: React.FC<Props> = ({ videoId, title }) => {
  return (
    <div className="youtube-container">
      <iframe
        width="100%"
        height="400"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
```

### 4. Adding New Items (Modals)

**Add Composer Modal:**
```tsx
// src/components/modals/AddComposerModal.tsx
export const AddComposerModal = ({ isOpen, onClose }) => {
  const { register, handleSubmit } = useForm<ComposerCreate>();
  const mutation = useMutation({
    mutationFn: (data: ComposerCreate) => api.post('/composers', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['composers']);
      toast.success('Composer added!');
      onClose();
    }
  });
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
        <Input {...register('name', { required: true })} label="Composer Name" />
        <Input {...register('period')} label="Period (optional)" />
        <Button type="submit">Add Composer</Button>
      </form>
    </Modal>
  );
};
```

**Add Composition Modal:**
```tsx
// src/components/modals/AddCompositionModal.tsx
export const AddCompositionModal = ({ composerId, isOpen, onClose }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<CompositionCreate>();
  
  const mutation = useMutation({
    mutationFn: (data: CompositionCreate) =>
      api.post('/compositions', { ...data, composer_id: composerId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['compositions', composerId]);
      toast.success('Composition added!');
      onClose();
    }
  });
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
        <Input {...register('title', { required: true })} label="Title*" />
        <Input {...register('opus')} label="Opus" />
        <Input {...register('number')} label="Number" />
        <Input
          {...register('youtube_url', {
            required: true,
            pattern: {
              value: /youtube\.com|youtu\.be/,
              message: 'Invalid YouTube URL'
            }
          })}
          label="YouTube URL*"
          error={errors.youtube_url?.message}
        />
        <Button type="submit">Add Composition</Button>
      </form>
    </Modal>
  );
};
```

### 5. Preventing Duplicate Labels

**Database Level:**
```python
# app/models/label.py
from beanie import Document, Indexed
from typing import Annotated

class Label(Document):
    composition: Link[Composition]
    emotion: Link[Emotion]
    user: Link[User]
    created_at: datetime
    
    class Settings:
        name = "labels"
        indexes = [
            # Compound unique index prevents duplicates
            [
                ("composition.$id", 1),
                ("emotion.$id", 1),
                ("user.$id", 1)
            ]
        ]
```

**Application Level:**
```python
# app/services/label_service.py
async def add_label_safe(
    composition_id: str,
    emotion_id: str,
    user_id: str
) -> Optional[Label]:
    """Add label only if it doesn't exist"""
    # Check existence first
    existing = await Label.find_one(
        Label.composition.id == composition_id,
        Label.emotion.id == emotion_id,
        Label.user.id == user_id
    )
    
    if existing:
        return None  # Already labeled
    
    # Create new label
    label = Label(
        composition=composition_id,
        emotion=emotion_id,
        user=user_id,
        created_at=datetime.utcnow()
    )
    await label.insert()
    return label
```

**Frontend UI:**
```tsx
// src/pages/CompositionDetailPage.tsx
const { data: myLabels } = useQuery({
  queryKey: ['my-labels', compositionId],
  queryFn: () => api.get(`/labels/my/${compositionId}`).then(res => res.data)
});

return (
  <div className="emotion-buttons">
    {emotions.map(emotion => {
      const isAlreadyLabeled = myLabels?.some(l => l.emotion_id === emotion.id);
      
      return (
        <Button
          key={emotion.id}
          disabled={isAlreadyLabeled}
          variant={isAlreadyLabeled ? 'outlined' : 'contained'}
          onClick={() => addLabel(emotion.id)}
        >
          {emotion.name}
          {isAlreadyLabeled && ' ✓'}
        </Button>
      );
    })}
  </div>
);
```

---

## Security Considerations (FastAPI Best Practices)

### 1. **Authentication & Authorization**
```python
# app/core/security.py
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user from JWT token"""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 2. **Input Validation (Pydantic)**
```python
# app/schemas/composition.py
from pydantic import BaseModel, HttpUrl, validator
from app.utils.youtube import validate_youtube_url

class CompositionCreate(BaseModel):
    title: str
    opus: Optional[str] = None
    number: Optional[str] = None
    youtube_url: HttpUrl
    composer_id: str
    
    @validator('youtube_url')
    def validate_youtube(cls, v):
        if not validate_youtube_url(str(v)):
            raise ValueError('Must be a valid YouTube URL')
        return v
    
    @validator('title')
    def validate_title(cls, v):
        if len(v) < 3:
            raise ValueError('Title must be at least 3 characters')
        if len(v) > 200:
            raise ValueError('Title too long')
        return v.strip()
```

### 3. **Rate Limiting**
```python
# app/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# In main.py
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# In endpoints
@router.post("/compositions")
@limiter.limit("10/minute")  # Max 10 compositions per minute
async def create_composition(
    request: Request,
    composition: CompositionCreate,
    current_user: User = Depends(get_current_user)
):
    # ... implementation
```

### 4. **CORS Configuration**
```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # ["https://yourdomain.com"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,  # Cache preflight requests for 1 hour
)
```

### 5. **Data Protection**
- Minimal PII collection (only email, username)
- HTTPS only (enforce in production)
- Database backups (MongoDB Atlas auto-backup)
- No sensitive data in logs
- Environment variables for secrets (never commit!)

---

## Deployment Strategy (AWS + FastAPI)

### **Recommended: Option 1 - AWS App Runner (Easiest)**

Perfect for Python FastAPI apps with minimal configuration.

**Frontend:**
```bash
# Build React app
cd frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

**Backend:**
```bash
# Create Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY ./app ./app

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Deploy to App Runner (automatic from GitHub)
# - Connect GitHub repo
# - App Runner builds and deploys automatically
# - Auto-scaling included
# - HTTPS certificate auto-generated
```

**Cost:** $5-25/month (pay-per-use)

---

### **Option 2: Elastic Beanstalk (More Control)**

**1. Create `requirements.txt`:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
beanie==1.23.6
motor==3.3.2
pydantic[email]==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
slowapi==0.1.9
```

**2. Create `Procfile`:**
```
web: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**3. Deploy:**
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p python-3.11 pmer-api

# Create environment
eb create pmer-api-prod

# Deploy
eb deploy

# Set environment variables
eb setenv MONGODB_URL=xxx SECRET_KEY=xxx
```

**Cost:** $15-30/month (t3.small instance)

---

### **Option 3: Docker Compose (Local/EC2)**

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:8000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - SECRET_KEY=${SECRET_KEY}
    env_file:
      - .env
```

**Deploy to EC2:**
```bash
# SSH into EC2
ssh -i key.pem ec2-user@your-instance-ip

# Install Docker & Docker Compose
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repo and run
git clone your-repo
cd pmer-dataset-collector
docker-compose up -d
```

**Cost:** $5-15/month (t3.micro with free tier)

---

### **Database: MongoDB Atlas Setup**

1. **Create Account:** https://www.mongodb.com/cloud/atlas
2. **Create Cluster:**
   - Choose AWS as cloud provider
   - Select same region as your backend (e.g., us-east-1)
   - Choose M0 (Free) for development, M10 for production
3. **Network Access:**
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or specific IPs from your backend servers
4. **Database User:**
   - Create username/password
   - Copy connection string
5. **Connection String:**
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pmer_collector?retryWrites=true&w=majority
   ```

---

### **Environment Variables Setup**

**Backend `.env` (Production):**
```bash
# App
PROJECT_NAME="PMER Dataset Collector"
VERSION="1.0.0"

# Security
SECRET_KEY="<generate with: openssl rand -hex 32>"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_DAYS=30
MAGIC_LINK_EXPIRE_MINUTES=15

# Database
MONGODB_URL="mongodb+srv://username:password@cluster.mongodb.net/pmer_collector"
MONGODB_DB_NAME="pmer_collector"

# CORS
CORS_ORIGINS='["https://yourdomain.com"]'

# Email (for magic links)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourdomain.com"

# Frontend
FRONTEND_URL="https://yourdomain.com"

# Goal
TARGET_COMPOSITIONS=1000
```

**Frontend `.env` (Production):**
```bash
VITE_API_URL=https://api.yourdomain.com
- Use AWS Free Tier (12 months free for EC2, S3)
- Consider t3.micro for backend (saves ~$10/month)
- Optimize CloudFront caching
- Use SES for emails (62,000 free/month)

---

## Python Dependencies (requirements.txt)

```txt
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
beanie==1.23.6
motor==3.3.2
pymongo==4.6.0

# Validation & Serialization
pydantic[email]==2.5.0
pydantic-settings==2.1.0

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Email
aiosmtplib==3.0.0
email-validator==2.1.0

# Rate Limiting
slowapi==0.1.9

# HTTP Client (for testing)
httpx==0.25.2

# Utilities
python-dotenv==1.0.0
```

**Development Dependencies (requirements-dev.txt):**
```txt
# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2

# Code Quality
black==23.12.0
flake8==6.1.0
mypy==1.7.1
isort==5.13.2

# Development Tools
ipython==8.18.1
```

---

## Future Enhancements & Roadmap

### **Phase 1: MVP (1-2 months)** ✅
- [ ] Basic authentication (magic link)
- [ ] Composer & composition CRUD
- [ ] Emotion management
- [ ] Labeling system with unlabeled→labeled transition
- [ ] Progress tracking
- [ ] Deploy to AWS

### **Phase 2: Enhancements (1 month)**
- [ ] **Analytics Dashboard**
  - Most labeled emotions
  - Top contributors leaderboard
  - Compositions per composer chart
  - Daily/weekly labeling stats
- [ ] **Data Export**
  - CSV export (composers, compositions, labels)
  - JSON export for analysis
  - Filter by date range, composer, emotion
- [ ] **Search & Filters**
  - Full-text search for compositions
  - Filter by period (Baroque, Romantic, etc.)
  - Sort by label count, date added

### **Phase 3: Advanced Features (Optional)**
- [ ] **Quality Control**
  - Flag inappropriate labels
  - Admin review interface
  - Confidence scores (when multiple users agree)
  - Remove outlier labels
- [ ] **ML Integration** (Perfect for Python!)
  ```python
  # Use scikit-learn or TensorFlow
  - Predict emotions based on music features
  - Cluster similar compositions
  - Recommend unlabeled compositions to users
  - Detect label patterns
  ```
- [ ] **Email Notifications**
  - Milestone achievements (100, 500, 1000 labels)
  - Weekly summary for contributors
  - New composers added alerts
- [ ] **User Profiles**
  - Personal contribution dashboard
  - Labeling history
  - Badges/achievements
  - Edit profile

### **Phase 4: Thesis Analysis Integration**
- [ ] **Jupyter Notebook Integration**
  ```python
  # Direct database connection for analysis
  import pandas as pd
  from pymongo import MongoClient
  
  # Load labeled data
  client = MongoClient(MONGODB_URL)
  db = client.pmer_collector
  
  # Analyze emotion distribution
  emotions = pd.DataFrame(list(db.labels.aggregate([...])))
  emotions.groupby('emotion_name').size().plot(kind='bar')
  ```
- [ ] **Statistical Analysis API Endpoints**
  - Emotion co-occurrence matrix
  - Composer-emotion associations
  - Time-series labeling activity
- [ ] **Data Visualization**
  - Interactive charts (Chart.js, D3.js)
  - Heatmaps of emotion×composer
  - Network graphs of emotion relationships

---

## Why This Architecture is Best for Your Use Case

### ✅ **Simple User-Friendly Focus**
1. **Magic Link Auth** - No passwords to remember, one-click login
2. **Progress Bar Always Visible** - Clear feedback on goal
3. **Matrix View** - Visual, intuitive navigation
4. **YouTube Embed** - Familiar interface for listening
5. **Clear State Transitions** - Unlabeled → Labeled is automatic and obvious

### ✅ **Data Collection Optimized**
1. **Duplicate Prevention** - Database + app level validation
2. **Progress Tracking** - Real-time count of labeled compositions
3. **Contributor Tracking** - Know who labeled what
4. **Easy Data Addition** - "+" buttons for composers/compositions/emotions
5. **No Data Loss** - Once labeled, always labeled

### ✅ **Research/Thesis Ready**
1. **Python Backend** - Same language for analysis (pandas, scikit-learn)
2. **MongoDB** - Flexible schema for evolving research needs
3. **Easy Export** - JSON/CSV for statistical analysis
4. **Direct DB Access** - Query from Jupyter notebooks
5. **Documented API** - Clear endpoints for scripting

### ✅ **Scalable & Maintainable**
1. **Clean Architecture** - Separation of concerns (API, services, models)
2. **Type Safety** - Pydantic models prevent bugs
3. **Auto-Documentation** - FastAPI generates API docs
4. **Testing-Friendly** - pytest for unit & integration tests
5. **Easy Deployment** - Docker + AWS App Runner

### ✅ **Cost-Effective**
1. **~$80-100/month** for production
2. **Free MongoDB M0** for development
3. **AWS Free Tier** eligible
4. **No expensive services** needed

---

## Quick Start Checklist

### Before You Start Coding:
- [ ] Read this entire architecture document
- [ ] Understand the 5 core architectural principles
- [ ] Decide on authentication method (recommend magic link)
- [ ] Set up MongoDB Atlas account
- [ ] Set up AWS account (if deploying immediately)
- [ ] Choose UI framework (MUI or Chakra UI)
- [ ] Prepare your existing 150 compositions data

### Development Setup:
- [ ] Clone/create Git repository
- [ ] Set up Python virtual environment
- [ ] Install backend dependencies
- [ ] Set up frontend with Vite + React + TypeScript
- [ ] Create .env files for both frontend/backend
- [ ] Initialize MongoDB with indexes
- [ ] Import existing 150 compositions

### During Development:
- [ ] Start with database models (Beanie)
- [ ] Build core API endpoints (composers, compositions, labels)
- [ ] Implement authentication
- [ ] Build frontend pages one by one
- [ ] Test the critical flow: add label → composition moves to labeled
- [ ] Deploy to staging environment
- [ ] Test with real users
- [ ] Deploy to production

---

## Important Reminders

### 🚨 Critical Rules:
1. **Never store passwords in plain text** (use bcrypt if using password auth)
2. **Never commit `.env` files** to Git (use `.env.example`)
3. **Always validate user input** (both frontend & backend)
4. **Test the unlabeled→labeled transition** extensively
5. **Backup database regularly** (MongoDB Atlas auto-backup is on)

### 🎯 Focus on MVP First:
Don't build:
- Complex analytics until data is collected
- Admin panel until needed
- Email notifications until core works
- ML features until you have labeled data

Do build:
- Simple, functional UI
- Reliable labeling system
- Progress tracking
- Easy data addition

### 📊 Data Quality:
- Track who labeled what (for thesis validity)
- Allow multiple users to label same composition
- Consider inter-rater reliability analysis later
- Keep audit trail (created_at timestamps)

---

## Questions Answered

### Q: Do I need passwords?
**A:** NO - Use magic link authentication. Simpler, more secure, better UX for research participants.

### Q: Can I use MongoDB on AWS?
**A:** YES - Use MongoDB Atlas (cloud-hosted). Select AWS region matching your backend. Perfect integration.

### Q: What's most important architecturally?
**A:** 
1. Separation of concerns (layers)
2. Single source of truth (database)
3. Clear state transitions (unlabeled → labeled)
4. Type safety (Pydantic models)
5. API documentation (FastAPI auto-gen)

### Q: How do I handle the 150 existing compositions?
**A:** Create a Python script in `backend/scripts/import_data.py`:
```python
# Import from CSV
import pandas as pd
from app.models.composer import Composer
from app.models.composition import Composition

async def import_existing_data():
    df = pd.read_csv('existing_data.csv')
    for _, row in df.iterrows():
        # Create composer if not exists
        composer = await Composer.find_one(Composer.name == row['composer'])
        if not composer:
            composer = Composer(name=row['composer'])
            await composer.insert()
        
        # Create composition
        comp = Composition(
            title=row['title'],
            composer=composer,
            youtube_url=row['youtube_url'],
            youtube_id=extract_youtube_id(row['youtube_url']),
            is_labeled=False,  # Start as unlabeled
            label_count=0
        )
        await comp.insert()
```

---

## Final Architecture Summary

**Frontend:** React + TypeScript + Vite + MUI + TanStack Query  
**Backend:** Python 3.11 + FastAPI + Beanie ODM  
**Database:** MongoDB Atlas (AWS)  
**Auth:** Magic Link (JWT tokens)  
**Hosting:** S3+CloudFront (frontend) + App Runner (backend)  
**Cost:** ~$80-100/month  

**Architecture Pattern:** Clean Architecture (Layered)  
- API Layer → Services Layer → Data Access Layer → Database

**Key Principle:** Simple, focused on data collection, easy to extend later for analysis.

---

## Need Help?

For questions about implementation:
1. Check FastAPI docs: https://fastapi.tiangolo.com
2. Beanie ODM docs: https://beanie-odm.dev
3. React Query docs: https://tanstack.com/query
4. MongoDB Atlas docs: https://www.mongodb.com/docs/atlas

**Good luck with your master thesis! 🎓🎵**

This architecture is specifically designed for your use case: a simple, user-friendly app for collecting emotional labels on classical music compositions. The Python backend makes it perfect for later analysis in your thesis.

---

*Last Updated: 2026-06-21*
VITE_APP_NAME=PMER Dataset Collector
```

---

## Development Workflow

### Initial Setup
```bash
# Clone repo
git clone <repo-url>
cd pmer-dataset-collector

# Install dependencies
npm install              # Root
cd client && npm install
cd ../server && npm install

# Setup environment
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit .env files with your values

# Start development
npm run dev              # From root (runs both client & server)
```

### Development Scripts (root package.json)
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev",
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm run build",
    "test": "npm run test:client && npm run test:server",
    "deploy:client": "cd infrastructure/scripts && ./deploy-client.sh",
    "deploy:server": "cd infrastructure/scripts && ./deploy-server.sh"
  }
}
```

---

## Performance Optimization

1. **Database Indexes**
   - Composers: name
   - Compositions: composerId, isLabeled
   - Labels: compositionId + emotionId + userId (compound)
   - Emotions: name

2. **Caching**
   - Progress count (5-minute cache)
   - Composer lists (10-minute cache)
   - Emotion lists (1-hour cache)

3. **Frontend**
   - Code splitting by route
   - Lazy load YouTube player
   - Image optimization for composer photos (if added)
   - React Query for aggressive caching

4. **Backend**
   - Pagination for large lists
   - Aggregate queries for counts
   - Connection pooling for MongoDB

---

## Cost Estimation (AWS)

### Monthly Costs (Estimated)
- **S3 + CloudFront**: $5-10 (low traffic)
- **Elastic Beanstalk (t3.small)**: $15-20
- **MongoDB Atlas (M10)**: $57
- **Route 53**: $1
- **Data Transfer**: $5-10

**Total**: ~$85-100/month

### Cost Optimization
- Use AWS Free Tier where possible
- Consider MongoDB Atlas M0 (free) for development
- Use t3.micro for backend if low traffic
- CloudFront caching to reduce S3 requests

---

## Future Enhancements

1. **Analytics Dashboard**
   - Most labeled emotions
   - Top contributors
   - Composition labeling distribution

2. **User Profiles**
   - View personal contribution history
   - Leaderboard

3. **Export Functionality**
   - Export dataset as CSV/JSON
   - Filtered exports (by composer, emotion, date range)

4. **Email Notifications**
   - Milestone achievements (100, 500, 1000 compositions)
   - Weekly summary for contributors

5. **Search & Filters**
   - Search compositions by name
   - Filter by period, composer, emotion

6. **Quality Control**
   - Flag inappropriate labels
   - Admin review interface
   - Label confidence scores (multiple users agree)

---

## Questions to Consider

1. **Authentication**: 
   - ✅ Recommended: Magic link or OAuth (lower barrier)
   - ⚠️ Alternative: Email/password with bcrypt

2. **Password Storage**: 
   - If using passwords: YES, always hash with bcrypt
   - If using magic links: NO passwords needed

3. **MongoDB on AWS**: 
   - ✅ YES - Use MongoDB Atlas (cloud-hosted, AWS regions available)
   - Integrates perfectly with AWS infrastructure
   - Managed service (backups, scaling, monitoring included)

4. **Initial Data Migration**:
   - How will you import existing 150 compositions?
   - CSV import script needed?

5. **Emotion Categories**:
   - Should emotions be categorized (joy, sadness, anger, etc.)?
   - Helps with analysis later

---

## Next Steps

1. **Setup Project**
   - Initialize Git repository
   - Create folder structure
   - Setup client (React + Vite)
   - Setup server (Node.js + Express)

2. **Database**
   - Create MongoDB Atlas account
   - Design and implement Mongoose schemas
   - Create seed data script

3. **Core Development**
   - Implement authentication
   - Build progress tracking
   - Create composer/composition CRUD
   - Implement labeling system

4. **Frontend Development**
   - Design UI/UX mockups
   - Implement routing
   - Build reusable components
   - Connect to backend API

5. **Testing & Deployment**
   - Write tests
   - Setup CI/CD pipeline
   - Deploy to AWS
   - Import existing data

---

## Contact & Support

For questions about this architecture, please reach out or create an issue in the repository.

**Good luck with your master thesis! 🎵**
