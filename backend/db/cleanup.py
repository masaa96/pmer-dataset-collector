"""Clean up leading/trailing whitespace from all collections."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings


def trim_strings(doc):
    """Recursively trim all string values in a document."""
    if isinstance(doc, dict):
        return {k: trim_strings(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [trim_strings(item) for item in doc]
    elif isinstance(doc, str):
        return doc.strip()
    return doc


async def cleanup():
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
    db = client[settings.mongodb_db_name]

    collections = ["users", "composers", "compositions", "labels"]
    total_updated = 0

    for col_name in collections:
        print(f"\nCleaning {col_name}...")
        col = db[col_name]
        docs = await col.find({}).to_list(None)

        if not docs:
            print(f"  No documents found")
            continue

        for doc in docs:
            trimmed_doc = trim_strings(doc)
            # Check if anything changed
            if doc != trimmed_doc:
                await col.update_one({"_id": doc["_id"]}, {"$set": trimmed_doc})
                total_updated += 1

        count = await col.count_documents({})
        print(f"  ✓ Updated {total_updated} documents in {col_name} (total: {count})")

    client.close()
    print(f"\n✅ Cleanup complete! Total documents updated: {total_updated}")


if __name__ == "__main__":
    asyncio.run(cleanup())
