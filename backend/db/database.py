"""MongoDB connection and index management.

Designed to be resilient in production: a failed/slow connection to MongoDB
(e.g. temporary network issues, IP allowlist changes, Atlas maintenance)
must never crash the whole API process. Instead we:
  - fail fast on each connection attempt (short serverSelectionTimeoutMS)
  - keep retrying forever in the background with exponential backoff
  - periodically ping the server to detect dropped connections and
    automatically resume retrying
  - expose `is_db_connected()` so routes can return a clear 503 instead of
    an obscure 500 while the database is unavailable
"""
import asyncio
import logging
from typing import Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket

from config import settings

logger = logging.getLogger("uvicorn.error")

_client: Optional[AsyncIOMotorClient] = None
_connected = False
_watchdog_task: Optional[asyncio.Task] = None

_SERVER_SELECTION_TIMEOUT_MS = 5000
_MIN_RETRY_DELAY_SECONDS = 2
_MAX_RETRY_DELAY_SECONDS = 30
_HEALTH_CHECK_INTERVAL_SECONDS = 15


def is_db_connected() -> bool:
    return _connected


def get_db() -> AsyncIOMotorDatabase:
    """Return the database handle, or raise a 503 if it's not currently
    reachable so the API responds with a clear, actionable error instead
    of an unhandled exception."""
    if not _connected or _client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again in a moment.",
        )
    return _client[settings.mongodb_db_name]


def get_gridfs_bucket() -> AsyncIOMotorGridFSBucket:
    """Return a GridFS bucket for storing/retrieving large binary files
    (e.g. sheet music PDFs) without hitting MongoDB's 16MB per-document
    BSON limit. See https://www.mongodb.com/docs/manual/core/gridfs/"""
    return AsyncIOMotorGridFSBucket(get_db(), bucket_name="sheet_pdfs")


async def _create_indexes(db: AsyncIOMotorDatabase):
    await db.users.create_index("email", unique=True)
    await db.composers.create_index("name", unique=True)
    await db.compositions.create_index([("composer_name", 1), ("labeled", 1)])
    await db.compositions.create_index("composer_id")
    await db.labels.create_index("composition_id")
    await db.labels.create_index("user_id")


async def _try_connect_once() -> bool:
    """Attempt a single connection + ping. Returns True on success."""
    global _client, _connected
    try:
        client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=_SERVER_SELECTION_TIMEOUT_MS,
        )
        await client.admin.command("ping")
        db = client[settings.mongodb_db_name]
        await _create_indexes(db)
        _client = client
        _connected = True
        logger.info("MongoDB connection established.")
        return True
    except Exception as exc:
        _connected = False
        logger.warning("MongoDB connection attempt failed: %s", exc)
        return False


async def _connection_watchdog():
    """Runs for the lifetime of the app: keeps (re)connecting whenever the
    database is unreachable, and periodically pings to detect drops."""
    global _connected
    delay = _MIN_RETRY_DELAY_SECONDS
    while True:
        if not _connected:
            success = await _try_connect_once()
            if not success:
                await asyncio.sleep(delay)
                delay = min(delay * 2, _MAX_RETRY_DELAY_SECONDS)
                continue
            delay = _MIN_RETRY_DELAY_SECONDS

        await asyncio.sleep(_HEALTH_CHECK_INTERVAL_SECONDS)
        try:
            await _client.admin.command("ping")
        except Exception as exc:
            logger.warning("Lost MongoDB connection: %s", exc)
            _connected = False


async def connect_db():
    """Called on app startup. Makes one immediate attempt so a normally
    healthy database connects right away, then hands off to a background
    watchdog task so the app keeps running (and auto-recovers) even if
    MongoDB is temporarily unreachable."""
    global _watchdog_task
    await _try_connect_once()
    _watchdog_task = asyncio.create_task(_connection_watchdog())


async def close_db():
    global _client, _watchdog_task
    if _watchdog_task:
        _watchdog_task.cancel()
    if _client:
        _client.close()
