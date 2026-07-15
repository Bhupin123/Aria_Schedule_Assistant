from datetime import date, timedelta, time
from sqlalchemy import text, select, func
from app.db.database import engine
from app.db.base import Base
import app.models.orm  # noqa: F401


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.run_sync(Base.metadata.create_all)

    await _seed_availability()


async def _seed_availability() -> None:
    from app.db.database import async_session_factory
    from app.models.orm.availability_slot import AvailabilitySlot

    async with async_session_factory() as session:
        today = date.today()
        window_end = today + timedelta(days=90)

        # Check how far ahead we have slots
        result = await session.execute(
            select(func.max(AvailabilitySlot.slot_date))
        )
        max_date = result.scalar_one_or_none()

        # Already seeded up to or beyond window_end
        if max_date and max_date >= window_end:
            return

        start_from = (max_date + timedelta(days=1)) if max_date else (today + timedelta(days=1))

        slots = []
        current = start_from
        while current <= window_end:
            for hour in range(9, 17):
                for minute in (0, 30):
                    slots.append(
                        AvailabilitySlot(
                            slot_date=current,
                            slot_time=time(hour, minute),
                            duration_minutes=30,
                            is_available=True,
                        )
                    )
            current += timedelta(days=1)

        if slots:
            session.add_all(slots)
            await session.commit()