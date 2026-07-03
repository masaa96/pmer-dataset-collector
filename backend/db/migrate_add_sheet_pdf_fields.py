"""One-off migration: add sheet_pdf_id / sheet_pdf_filename fields (both null)
to any existing compositions documents created before the sheet music PDF
upload feature was added. New/updated documents already get these fields via
add_composition_to_composer() and upload_sheet_pdf(), so this only needs to
run once against data that predates that change.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings


async def migrate():
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
    db = client[settings.mongodb_db_name]

    result = await db.compositions.update_many(
        {"sheet_pdf_id": {"$exists": False}},
        {"$set": {"sheet_pdf_id": None, "sheet_pdf_filename": None}},
    )

    total = await db.compositions.count_documents({})
    print(f"Updated {result.modified_count} of {total} composition documents with sheet_pdf fields.")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
