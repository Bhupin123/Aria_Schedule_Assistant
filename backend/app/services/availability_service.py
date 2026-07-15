from datetime import date, time, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.availability_repository import AvailabilityRepository
from app.models.orm.availability_slot import AvailabilitySlot


class AvailabilityService:
    def __init__(self, session: AsyncSession):
        self.repo = AvailabilityRepository(session)

    async def get_slots_for_date(self, slot_date: date) -> list[dict]:
        slots = await self.repo.find_available_by_date(slot_date)
        return [
            {
                "slot_id": s.id,
                "date": s.slot_date.isoformat(),
                "time": s.slot_time.strftime("%H:%M"),
                "duration_minutes": s.duration_minutes,
            }
            for s in slots
        ]

    async def find_slot(self, slot_date: date, slot_time: time) -> AvailabilitySlot | None:
        return await self.repo.find_by_date_time(slot_date, slot_time)

    async def seed_slots(
        self,
        slot_date: date,
        start_time: time,
        end_time: time,
        interval_minutes: int = 30,
    ) -> int:
        existing = await self.repo.find_available_by_date(slot_date)
        existing_times = {s.slot_time for s in existing}

        slots_data = []
        current = start_time
        while current < end_time:
            if current not in existing_times:
                slots_data.append(
                    {
                        "slot_date": slot_date,
                        "slot_time": current,
                        "duration_minutes": interval_minutes,
                        "is_available": True,
                    }
                )
            h = current.hour
            m = current.minute + interval_minutes
            h += m // 60
            m = m % 60
            if h >= 24:
                break
            current = time(h, m)

        if not slots_data:
            return 0
        return await self.repo.bulk_create(slots_data)

    async def release_slot(self, slot_id: str) -> bool:
        return await self.repo.mark_available(slot_id)
