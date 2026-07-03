import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def test_connection():
    try:
        print(f"Connecting to: {settings.mongodb_uri}")
        print(f"Database: {settings.mongodb_db_name}")
        
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
        db = client[settings.mongodb_db_name]
        
        # Ping the database
        await db.command("ping")
        print("✅ MongoDB connection successful!")
        
        # Get collection info
        collections = await db.list_collection_names()
        print(f"✅ Collections found: {collections}")
        
        # Check document counts
        for col in ["users", "composers", "compositions", "labels"]:
            count = await db[col].count_documents({})
            print(f"  - {col}: {count} documents")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)
