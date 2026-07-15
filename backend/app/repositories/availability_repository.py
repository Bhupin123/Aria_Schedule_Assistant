from datetime import date, time
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.orm.availability_slot import AvailabilitySlot


class AvailabilityRepository(BaseRepository[AvailabilitySlot]):
    def __init__(self, session: AsyncSession):
        super().__init__(AvailabilitySlot, session)

    async def find_available_by_date(self, slot_date: date) -> list[AvailabilitySlot]:
        result = await self.session.execute(
            select(AvailabilitySlot)
            .where(and_(AvailabilitySlot.slot_date == slot_date, AvailabilitySlot.is_available == True))
            .order_by(AvailabilitySlot.slot_time)
        )
        return list(result.scalars().all())

    async def find_by_date_time(self, slot_date: date, slot_time: time) -> Optional[AvailabilitySlot]:
        result = await self.session.execute(
            select(AvailabilitySlot).where(
                and_(AvailabilitySlot.slot_date == slot_date, AvailabilitySlot.slot_time == slot_time)
            )
        )
        return result.scalar_one_or_none()

    async def mark_unavailable(self, slot_id: str) -> bool:
        slot = await self.get(slot_id)
        if not slot:
            return False
        slot.is_available = False
        await self.session.flush()
        return True

    async def mark_available(self, slot_id: str) -> bool:
        slot = await self.get(slot_id)
        if not slot:
            return False
        slot.is_available = True
        await self.session.flush()
        return True

    async def bulk_create(self, slots_data: list[dict]) -> int:
        slots = [AvailabilitySlot(**d) for d in slots_data]
        self.session.add_all(slots)
        await self.session.flush()
        return len(slots)
