"""Quick MongoDB connectivity check.

Run this any time you want to verify the current machine can actually reach
the configured Atlas cluster (uses the same MONGODB_URI as the backend app).

Usage:
    python db/check_connection.py
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from config import settings


def check_connection():
    print(f"Connecting to database '{settings.mongodb_db_name}'...")
    start = time.time()
    try:
        client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=15000, connectTimeoutMS=15000)
        result = client.admin.command("ping")
        elapsed = time.time() - start
        print(f"SUCCESS - ping responded in {elapsed:.2f}s: {result}")

        db = client[settings.mongodb_db_name]
        collections = db.list_collection_names()
        print(f"Collections in '{settings.mongodb_db_name}': {collections}")

        compositions_count = db.compositions.count_documents({})
        print(f"compositions count: {compositions_count}")

        client.close()
    except PyMongoError as exc:
        elapsed = time.time() - start
        print(f"FAILED after {elapsed:.2f}s: {type(exc).__name__}: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    check_connection()
