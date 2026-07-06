# PMER Dataset Collector

**🔗 Live app:** [pmer-dataset-collector.com](https://pmer-dataset-collector.com/)

A web application for collecting emotional labeling data for classical music compositions as part of a master thesis research project.

## What It Does

This application allows users to:
- Browse classical music compositions by composer
- Listen to compositions via embedded YouTube videos
- View/upload sheet music (PDF) for a composition
- Label compositions with emotions (joy, sadness, anger, etc.)
- Add new composers and compositions to expand the dataset
- Track progress toward the collection target (see `collection_target` in `backend/config.py`)

The app distinguishes between **labeled** (compositions with at least one emotion assigned) and **unlabeled** compositions, making it easy for users to contribute new data.

## How to Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- A MongoDB database (local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then fill in MONGODB_URI, SECRET_KEY, ADMIN_EMAILS, etc.
python main.py
```
Backend runs on http://localhost:8000 (API docs at `/docs`)

### Frontend (React + Vite)
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on localhost:8000
npm run dev (or npm.cmd run dev)
```
Frontend runs on http://localhost:5173

Open http://localhost:5173 in your browser to use the application.

## Notes
- The first account to log in with an email listed in `ADMIN_EMAILS` (backend `.env`) gets admin privileges (e.g. adding YouTube links to compositions).
- Sheet music PDFs are stored in MongoDB via GridFS, capped at 16 MB per file.
- For deploying to a production server (e.g. a DigitalOcean droplet), see [DEPLOYMENT.md](DEPLOYMENT.md).

