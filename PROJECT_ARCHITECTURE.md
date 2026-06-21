# PMER Dataset Collector - Project Architecture

## Executive Summary

This document outlines the architecture for a web application designed to collect emotional labeling data for classical music compositions for your master thesis.

**Goal**: Collect 1000 labeled compositions (currently at 150/1000)

---

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Context API + React Query (for server state)
- **Routing**: React Router v6
- **UI Framework**: Material-UI (MUI) or Tailwind CSS
- **Build Tool**: Vite
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi or Zod
- **API Documentation**: Swagger/OpenAPI

### Database
- **Primary Database**: MongoDB Atlas (AWS-hosted)
  - **Why MongoDB?**
    - Flexible schema for adding new emotions dynamically
    - Easy to handle nested structures (composers → compositions → emotions)
    - Native JSON support
    - MongoDB Atlas integrates seamlessly with AWS
    - Great for rapid development and schema evolution

### AWS Infrastructure
- **Frontend Hosting**: 
  - S3 (static file hosting) + CloudFront (CDN)
  - Alternative: Amplify Hosting
- **Backend Hosting**: 
  - Elastic Beanstalk (recommended for simplicity) or
  - ECS with Fargate (containerized) or
  - EC2 (manual setup)
- **Database**: MongoDB Atlas (cloud-hosted, with AWS region selection)
- **Media**: YouTube embeds (no storage needed)
- **Domain/SSL**: Route 53 + Certificate Manager

---

## Authentication Strategy

### Recommendation: **Lightweight Authentication**

For an open academic research application:

1. **Minimal Registration**
   - Collect: username/email (for tracking contributions)
   - **NO password required** for initial access
   - Generate magic link or simple token sent to email
   - Or use OAuth (Google/GitHub) for zero-friction signup

2. **Session Management**
   - JWT tokens with 30-day expiration
   - Store user contributions tied to their ID
   - Allow anonymous browsing but require login to submit labels

3. **Benefits**
   - Lower barrier to entry (more participants)
   - Still track who labeled what (for data quality)
   - Prevent spam/duplicate labeling
   - GDPR-friendly (minimal PII)

**Alternative**: If you want password-based auth, use bcrypt for hashing and implement basic email/password login.

---

## Database Schema Design

### Collections

#### 1. **users**
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique, indexed),
  createdAt: Date,
  lastLogin: Date,
  contributionCount: Number
}
```

#### 2. **composers**
```javascript
{
  _id: ObjectId,
  name: String (indexed),
  birthYear: Number (optional),
  deathYear: Number (optional),
  period: String (e.g., "Baroque", "Romantic"),
  addedBy: ObjectId (ref: users),
  createdAt: Date,
  compositionCount: Number (computed)
}
```

#### 3. **compositions**
```javascript
{
  _id: ObjectId,
  composerId: ObjectId (ref: composers, indexed),
  title: String,
  opus: String (optional),
  number: String (optional),
  youtubeUrl: String,
  youtubeId: String (extracted from URL),
  isLabeled: Boolean (indexed),
  labelCount: Number (number of emotion labels),
  addedBy: ObjectId (ref: users),
  createdAt: Date
}
```

#### 4. **emotions**
```javascript
{
  _id: ObjectId,
  name: String (unique, indexed),
  category: String (e.g., "positive", "negative", "neutral"),
  addedBy: ObjectId (ref: users),
  usageCount: Number (how many times used),
  createdAt: Date
}
```

#### 5. **labels**
```javascript
{
  _id: ObjectId,
  compositionId: ObjectId (ref: compositions, indexed),
  emotionId: ObjectId (ref: emotions, indexed),
  userId: ObjectId (ref: users, indexed),
  createdAt: Date
}
```
*Note: Compound index on (compositionId, emotionId, userId) to prevent duplicate labels*

#### 6. **progress**
```javascript
{
  _id: ObjectId,
  totalCompositions: Number,
  labeledCompositions: Number,
  goalCompositions: Number (default: 1000),
  lastUpdated: Date
}
```
*Single document for global progress tracking*

---

## Project Structure

```
pmer-dataset-collector/
├── client/                          # Frontend React application
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── common/
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── TabNavigation.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Layout.tsx
│   │   │   └── youtube/
│   │   │       └── YouTubePlayer.tsx
│   │   ├── pages/                   # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── labeled/
│   │   │   │   ├── LabeledComposersPage.tsx
│   │   │   │   ├── LabeledCompositionsPage.tsx
│   │   │   │   └── LabeledCompositionDetailPage.tsx
│   │   │   └── unlabeled/
│   │   │       ├── UnlabeledComposersPage.tsx
│   │   │       ├── UnlabeledCompositionsPage.tsx
│   │   │       └── UnlabeledCompositionDetailPage.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useProgress.ts
│   │   │   ├── useComposers.ts
│   │   │   └── useCompositions.ts
│   │   ├── services/                # API service layer
│   │   │   ├── api.ts               # Axios instance config
│   │   │   ├── authService.ts
│   │   │   ├── composerService.ts
│   │   │   ├── compositionService.ts
│   │   │   ├── emotionService.ts
│   │   │   └── labelService.ts
│   │   ├── context/                 # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ProgressContext.tsx
│   │   ├── types/                   # TypeScript type definitions
│   │   │   ├── user.types.ts
│   │   │   ├── composer.types.ts
│   │   │   ├── composition.types.ts
│   │   │   └── emotion.types.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── youtube.ts           # Extract YouTube ID
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── constants/
│   │   │   └── routes.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── server/                          # Backend Node.js application
│   ├── src/
│   │   ├── config/                  # Configuration files
│   │   │   ├── database.ts          # MongoDB connection
│   │   │   ├── env.ts               # Environment variables
│   │   │   └── swagger.ts           # API documentation
│   │   ├── models/                  # Mongoose models
│   │   │   ├── User.ts
│   │   │   ├── Composer.ts
│   │   │   ├── Composition.ts
│   │   │   ├── Emotion.ts
│   │   │   ├── Label.ts
│   │   │   └── Progress.ts
│   │   ├── controllers/             # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── composerController.ts
│   │   │   ├── compositionController.ts
│   │   │   ├── emotionController.ts
│   │   │   ├── labelController.ts
│   │   │   └── progressController.ts
│   │   ├── services/                # Business logic layer
│   │   │   ├── authService.ts
│   │   │   ├── composerService.ts
│   │   │   ├── compositionService.ts
│   │   │   ├── emotionService.ts
│   │   │   ├── labelService.ts
│   │   │   └── progressService.ts
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.ts              # JWT verification
│   │   │   ├── errorHandler.ts
│   │   │   ├── validation.ts
│   │   │   └── rateLimiter.ts
│   │   ├── routes/                  # API routes
│   │   │   ├── index.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── composerRoutes.ts
│   │   │   ├── compositionRoutes.ts
│   │   │   ├── emotionRoutes.ts
│   │   │   ├── labelRoutes.ts
│   │   │   └── progressRoutes.ts
│   │   ├── validators/              # Request validation schemas
│   │   │   ├── authValidators.ts
│   │   │   ├── composerValidators.ts
│   │   │   ├── compositionValidators.ts
│   │   │   └── emotionValidators.ts
│   │   ├── types/                   # TypeScript types
│   │   │   ├── express.d.ts         # Extend Express types
│   │   │   └── models.types.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── jwt.ts
│   │   │   ├── logger.ts
│   │   │   └── youtubeValidator.ts
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Server entry point
│   ├── tests/                       # Test files
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── shared/                          # Shared types/constants (optional)
│   └── types/
│       └── api.types.ts
│
├── infrastructure/                  # AWS deployment configs
│   ├── cloudformation/
│   │   └── template.yaml
│   ├── docker/
│   │   ├── Dockerfile.client
│   │   └── Dockerfile.server
│   └── scripts/
│       ├── deploy-client.sh
│       └── deploy-server.sh
│
├── docs/                            # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
├── .gitignore
├── README.md
├── PROJECT_ARCHITECTURE.md
└── package.json                     # Root package.json for monorepo scripts
```

---

## API Endpoints Design

### Authentication
```
POST   /api/auth/register            # Register new user
POST   /api/auth/login               # Login (email/magic link)
POST   /api/auth/logout              # Logout
GET    /api/auth/me                  # Get current user
```

### Progress
```
GET    /api/progress                 # Get global progress
```

### Composers
```
GET    /api/composers                # Get all composers
GET    /api/composers/:id            # Get single composer
POST   /api/composers                # Create new composer
GET    /api/composers/:id/compositions  # Get compositions by composer
GET    /api/composers/labeled        # Get composers with labeled compositions
GET    /api/composers/unlabeled      # Get composers with unlabeled compositions
```

### Compositions
```
GET    /api/compositions             # Get all compositions (with filters)
GET    /api/compositions/:id         # Get single composition
POST   /api/compositions             # Create new composition
GET    /api/compositions/:id/labels  # Get labels for composition
GET    /api/compositions/labeled     # Get labeled compositions
GET    /api/compositions/unlabeled   # Get unlabeled compositions
```

### Emotions
```
GET    /api/emotions                 # Get all emotions
GET    /api/emotions/:id             # Get single emotion
POST   /api/emotions                 # Create new emotion
```

### Labels
```
POST   /api/labels                   # Add emotion label to composition
DELETE /api/labels/:id               # Remove label (admin only)
GET    /api/labels/composition/:id   # Get all labels for composition
```

---

## Key Features Implementation

### 1. Progress Bar
- **Frontend**: Global state (Context API)
- **Backend**: Aggregate query to count distinct labeled compositions
- **Update Trigger**: After adding first label to unlabeled composition
- **Caching**: Redis or in-memory cache (update every 5 minutes)

### 2. Matrix View for Composers/Compositions
- **Component**: Grid layout with CSS Grid or MUI Grid
- **Each Button Shows**:
  - Composer/Composition name
  - Badge with label count
  - Visual indicator (icon/color) if labeled vs unlabeled

### 3. YouTube Embed
```typescript
// Extract YouTube ID from URL
const extractYouTubeId = (url: string): string => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

// Embed component
<iframe
  src={`https://www.youtube.com/embed/${youtubeId}`}
  allowFullScreen
/>
```

### 4. Adding New Items (Composers/Compositions/Emotions)
- **UI**: Modal/Dialog with form
- **Validation**: Frontend + Backend
- **Immediate Feedback**: Optimistic updates with React Query

### 5. Preventing Duplicate Labels
- **Database**: Compound unique index on (compositionId, emotionId, userId)
- **Frontend**: Disable already-selected emotion buttons
- **Backend**: Handle duplicate errors gracefully

---

## Data Flow Example

### User Labels a Composition

1. User clicks unlabeled composition
2. Frontend fetches composition + existing labels
3. User clicks emotion button(s)
4. Frontend sends POST to `/api/labels`
   ```json
   {
     "compositionId": "...",
     "emotionIds": ["emotion1", "emotion2"],
     "userId": "..."
   }
   ```
5. Backend:
   - Validates composition exists
   - Validates emotions exist
   - Checks if composition was previously unlabeled
   - Creates label documents
   - If first label on composition, increment progress count
   - Returns updated composition with all labels
6. Frontend:
   - Updates composition in cache
   - Updates progress bar if needed
   - Shows success feedback

---

## Security Considerations

1. **Authentication**
   - JWT with httpOnly cookies (prevent XSS)
   - CORS configuration for frontend domain only
   - Rate limiting on auth endpoints

2. **Input Validation**
   - Validate YouTube URLs (prevent XSS)
   - Sanitize all user inputs
   - Limit composition/composer creation rate

3. **Authorization**
   - Users can only label (not delete labels)
   - Track who added what for quality control
   - Optional: Admin role for data cleanup

4. **Data Protection**
   - Minimal PII collection
   - HTTPS only
   - Regular database backups

---

## Deployment Strategy

### Option 1: Simple (Recommended for MVP)
1. **Frontend**: S3 + CloudFront
   - Build React app: `npm run build`
   - Upload to S3 bucket
   - Configure CloudFront distribution
2. **Backend**: Elastic Beanstalk
   - Package Node.js app
   - Deploy via EB CLI
   - Auto-scaling enabled
3. **Database**: MongoDB Atlas
   - AWS region: same as backend
   - M10 tier (good for this scale)

### Option 2: Containerized
1. **Frontend**: S3 + CloudFront (same as above)
2. **Backend**: ECS with Fargate
   - Docker container
   - ALB for load balancing
   - Auto-scaling based on CPU
3. **Database**: MongoDB Atlas

### Environment Variables
```bash
# Backend .env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d
CORS_ORIGIN=https://your-domain.com
AWS_REGION=us-east-1

# Frontend .env
VITE_API_URL=https://api.your-domain.com
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
