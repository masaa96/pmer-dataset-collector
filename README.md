# PMER Dataset Collector

A web application for collecting emotional labeling data for classical music compositions as part of a master thesis research project.

## What It Does

This application allows users to:
- Browse classical music compositions by composer
- Listen to compositions via embedded YouTube videos
- Label compositions with emotions (joy, sadness, anger, etc.)
- Add new composers and compositions to expand the dataset
- Track progress toward the goal of 1000 labeled compositions

The app distinguishes between **labeled** (compositions with at least one emotion assigned) and **unlabeled** compositions, making it easy for users to contribute new data.

## How to Start

### Prerequisites
- Python 3.8+
- Node.js 16+

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend runs on http://localhost:8000

### Frontend (React + Vite)
```bash
cd frontend
npm install
node node_modules/vite/bin/vite.js
```
Frontend runs on http://localhost:5173

Open http://localhost:5173 in your browser to use the application.
