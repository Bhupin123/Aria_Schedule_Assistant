from datetime import date, time
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.booking_repository import BookingRepository
from app.repositories.availability_repository import AvailabilityRepository
from app.models.orm.booking import Booking
from app.core.config import settings


class BookingError(Exception):
    pass


class BookingService:
    def __init__(self, session: AsyncSession):
        self.repo = BookingRepository(session)
        self.slot_repo = AvailabilityRepository(session)
        self.session = session

    async def create_booking(
        self,
        slot_id: str,
        email: str,
        booking_date: date,
        booking_time: time,
        purpose: Optional[str] = None,
    ) -> Booking:
        active = await self.repo.count_active_by_email(email)
        if active >= settings.MAX_ACTIVE_BOOKINGS_PER_EMAIL:
            raise BookingError(f"Maximum of {settings.MAX_ACTIVE_BOOKINGS_PER_EMAIL} active bookings reached.")

        existing = await self.repo.find_by_slot(slot_id)
        if existing:
            raise BookingError("This slot is already booked.")

        booking = await self.repo.create(
            availability_slot_id=slot_id,
            email=email,
            booking_date=booking_date,
            booking_time=booking_time,
            purpose=purpose,
            status="confirmed",
        )
        await self.slot_repo.mark_unavailable(slot_id)
        return booking

    async def cancel_booking(self, booking_id: str, reason: Optional[str] = None) -> Booking:
        booking = await self.repo.get(booking_id)
        if not booking:
            raise BookingError("Booking not found.")
        if booking.status != "confirmed":
            raise BookingError("Only confirmed bookings can be cancelled.")

        booking = await self.repo.update(booking, status="cancelled", cancelled_reason=reason)
        await self.slot_repo.mark_available(booking.availability_slot_id)
        return booking

    async def get_booking(self, booking_id: str) -> Optional[Booking]:
        return await self.repo.get(booking_id)

    async def list_bookings(
        self,
        page: int = 1,
        limit: int = 20,
        email: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[list[Booking], int]:
        return await self.repo.paginate(page, limit, email, status)
