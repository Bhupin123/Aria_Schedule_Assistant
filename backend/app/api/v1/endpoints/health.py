from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import time
from app.db.database import get_db_session
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


@router.get("/health/db")
async def health_db(session: AsyncSession = Depends(get_db_session)):
    start = time.monotonic()
    await session.execute(text("SELECT 1"))
    latency = round((time.monotonic() - start) * 1000, 2)
    return {"status": "ok", "latency_ms": latency}
