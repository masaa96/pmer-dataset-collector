"""Check for whitespace in database."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings


async def check():
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
    db = client[settings.mongodb_db_name]

    # Check compositions with spaces in emotions
    docs = await db.compositions.find({"emotions": {"$regex": "^ | $"}}).to_list(100)
    
    if docs:
        print(f"Found {len(docs)} compositions with leading/trailing spaces in emotions:\n")
        for doc in docs[:5]:
            print(f"Composer: {doc.get('composer_name')}")
            print(f"Composition: {doc.get('name')}")
            print(f"Emotions: {doc.get('emotions')}")
            print()
    else:
        print("No documents found with whitespace in emotions")
    
    # Sample check
    print("\nSample emotions check:")
    sample = await db.compositions.find_one({"emotions": {"$exists": True, "$not": {"$size": 0}}})
    if sample:
        print(f"Sample: {sample.get('emotions')}")
        for emotion in sample.get('emotions', []):
            print(f"  |{emotion}| (len={len(emotion)})")

    client.close()


if __name__ == "__main__":
    asyncio.run(check())
