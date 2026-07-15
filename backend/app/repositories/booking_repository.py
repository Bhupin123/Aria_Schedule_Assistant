from datetime import date
from typing import Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.orm.booking import Booking


class BookingRepository(BaseRepository[Booking]):
    def __init__(self, session: AsyncSession):
        super().__init__(Booking, session)

    async def find_by_email(self, email: str, status: Optional[str] = None) -> list[Booking]:
        q = select(Booking).where(Booking.email == email)
        if status:
            q = q.where(Booking.status == status)
        q = q.order_by(Booking.booking_date.desc())
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def find_by_slot(self, slot_id: str) -> Optional[Booking]:
        result = await self.session.execute(
            select(Booking).where(
                and_(Booking.availability_slot_id == slot_id, Booking.status == "confirmed")
            )
        )
        return result.scalar_one_or_none()

    async def paginate(
        self,
        page: int = 1,
        limit: int = 20,
        email: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[list[Booking], int]:
        q = select(Booking)
        if email:
            q = q.where(Booking.email == email)
        if status:
            q = q.where(Booking.status == status)

        total_q = select(func.count()).select_from(q.subquery())
        total = (await self.session.execute(total_q)).scalar_one()

        q = q.order_by(Booking.booking_date.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.session.execute(q)
        return list(result.scalars().all()), total

    async def count_active_by_email(self, email: str) -> int:
        result = await self.session.execute(
            select(func.count()).where(and_(Booking.email == email, Booking.status == "confirmed"))
        )
        return result.scalar_one()
