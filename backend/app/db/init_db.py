from datetime import date, timedelta, time
from sqlalchemy import text
from app.db.database import engine
from app.db.base import Base
import app.models.orm  # noqa: F401 — registers all ORM models


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.run_sync(Base.metadata.create_all)

    await _seed_availability()


async def _seed_availability() -> None:
    from app.db.database import async_session_factory
    from app.models.orm.availability_slot import AvailabilitySlot
    from sqlalchemy import select

    async with async_session_factory() as session:
        result = await session.execute(select(AvailabilitySlot).limit(1))
        if result.scalar_one_or_none():
            return  # already seeded

        slots = []
        today = date.today()
        for day_offset in range(1, 31):
            slot_date = today + timedelta(days=day_offset)
            hour = 9
            while hour < 17:
                slots.append(
                    AvailabilitySlot(
                        slot_date=slot_date,
                        slot_time=time(hour, 0),
                        duration_minutes=30,
                        is_available=True,
                    )
                )
                slots.append(
                    AvailabilitySlot(
                        slot_date=slot_date,
                        slot_time=time(hour, 30),
                        duration_minutes=30,
                        is_available=True,
                    )
                )
                hour += 1

        session.add_all(slots)
        await session.commit()
