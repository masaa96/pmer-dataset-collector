"""Seed database with actual data from Excel and JSON files."""
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

DATA_DIR = Path(__file__).parent.parent.parent / "data"
EXCEL_FILE = DATA_DIR / "composition_emotions_dataset.xlsx"
JSON_FILE = DATA_DIR / "new_composers.json"


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
    db = client[settings.mongodb_db_name]
    now = datetime.utcnow()

    # Drop all collections
    for col in ["users", "composers", "compositions", "labels", "test-collection"]:
        try:
            await db[col].drop()
            print(f"✓ Dropped {col}")
        except:
            pass

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.composers.create_index("name", unique=True)
    await db.compositions.create_index([("composer_name", 1), ("labeled", 1)])

    # Read Excel file
    print(f"\nReading {EXCEL_FILE.name}...")
    df = pd.read_excel(EXCEL_FILE)
    print(f"Loaded {len(df)} compositions from Excel")

    composers_map = {}
    compositions_list = []

    # Process Excel data
    for _, row in df.iterrows():
        composer_name = str(row["Composer Name"]).strip()
        composition_name = str(row["Composition Name"]).strip()

        # Get emotions (skip NaN)
        emotions = []
        for i in range(1, 12):
            emotion = row.get(f"Emotion {i}")
            if pd.notna(emotion):
                emotions.append(str(emotion).strip())

        # Add composer if not exists
        if composer_name not in composers_map:
            result = await db.composers.insert_one(
                {"name": composer_name, "created_at": now, "updated_at": now}
            )
            composers_map[composer_name] = result.inserted_id
            print(f"  + Added composer: {composer_name}")

        # Add composition
        compositions_list.append(
            {
                "name": composition_name,
                "composer_id": composers_map[composer_name],
                "composer_name": composer_name,
                "labeled": len(emotions) > 0,
                "emotions": emotions,
                "youtube_url": None,
                "created_at": now,
                "updated_at": now,
            }
        )

    # Insert all compositions
    if compositions_list:
        result = await db.compositions.insert_many(compositions_list)
        print(f"✓ Inserted {len(result.inserted_ids)} compositions from Excel")

    # Read JSON file (new composers)
    if JSON_FILE.exists():
        print(f"\nReading {JSON_FILE.name}...")
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            new_composers_data = json.load(f)

        for composer_data in new_composers_data:
            composer_name = str(composer_data["name"]).strip()

            # Add composer if not already in database
            if composer_name not in composers_map:
                result = await db.composers.insert_one(
                    {"name": composer_name, "created_at": now, "updated_at": now}
                )
                composers_map[composer_name] = result.inserted_id
                print(f"  + Added new composer: {composer_name}")

            # Add compositions
            for comp in composer_data.get("compositions", []):
                if isinstance(comp, dict):
                    comp_name = str(comp.get("name", "")).strip()
                    youtube_url = comp.get("youtube_url")
                    if youtube_url:
                        youtube_url = str(youtube_url).strip()
                    emotions = [str(e).strip() for e in comp.get("emotions", [])]

                    # Check if composition already exists
                    existing = await db.compositions.find_one(
                        {"composer_id": composers_map[composer_name], "name": comp_name}
                    )

                    if not existing:
                        await db.compositions.insert_one(
                            {
                                "name": comp_name,
                                "composer_id": composers_map[composer_name],
                                "composer_name": composer_name,
                                "labeled": len(emotions) > 0,
                                "emotions": emotions,
                                "youtube_url": youtube_url,
                                "created_at": now,
                                "updated_at": now,
                            }
                        )
                        print(f"  + Added composition: {comp_name}")
                    else:
                        # Update with new emotions and youtube_url if available
                        await db.compositions.update_one(
                            {"_id": existing["_id"]},
                            {
                                "$set": {
                                    "emotions": emotions,
                                    "labeled": len(emotions) > 0,
                                    "youtube_url": youtube_url,
                                    "updated_at": now,
                                }
                            },
                        )
                        print(f"  ~ Updated composition: {comp_name}")

    # Create demo user
    await db.users.insert_one(
        {"email": "demo@example.com", "name": "Demo User", "created_at": now, "label_count": 0}
    )
    print(f"\n✓ Created demo user: demo@example.com")

    # Print summary
    print("\n" + "=" * 50)
    composers_count = await db.composers.count_documents({})
    compositions_count = await db.compositions.count_documents({})
    labeled_count = await db.compositions.count_documents({"labeled": True})
    unlabeled_count = await db.compositions.count_documents({"labeled": False})
    users_count = await db.users.count_documents({})

    print(f"Database: {settings.mongodb_db_name}")
    print(f"Composers: {composers_count}")
    print(f"Compositions: {compositions_count} (labeled: {labeled_count}, unlabeled: {unlabeled_count})")
    print(f"Users: {users_count}")
    print("=" * 50)

    client.close()
    print("\n✅ Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
