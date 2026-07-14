import pytest
from datetime import date, time, timedelta
from app.repositories.availability_repository import AvailabilityRepository
from app.repositories.booking_repository import BookingRepository
from app.models.orm.availability_slot import AvailabilitySlot


today = date.today()
tomorrow = today + timedelta(days=1)


@pytest.fixture
async def slot(db_session):
    s = AvailabilitySlot(
        slot_date=tomorrow,
        slot_time=time(14, 0),
        duration_minutes=30,
        is_available=True,
    )
    db_session.add(s)
    await db_session.flush()
    return s


class TestAvailabilityRepository:
    async def test_find_available_by_date_returns_slots(self, seeded_db):
        repo = AvailabilityRepository(seeded_db)
        slots = await repo.find_available_by_date(tomorrow)
        assert len(slots) > 0
        assert all(s.is_available for s in slots)
        assert all(s.slot_date == tomorrow for s in slots)

    async def test_find_available_by_date_empty_for_unknown_date(self, db_session):
        repo = AvailabilityRepository(db_session)
        slots = await repo.find_available_by_date(date(2099, 1, 1))
        assert slots == []

    async def test_find_by_date_time(self, seeded_db):
        repo = AvailabilityRepository(seeded_db)
        slot = await repo.find_by_date_time(tomorrow, time(9, 0))
        assert slot is not None
        assert slot.slot_time == time(9, 0)

    async def test_find_by_date_time_missing(self, db_session):
        repo = AvailabilityRepository(db_session)
        slot = await repo.find_by_date_time(tomorrow, time(13, 0))
        assert slot is None

    async def test_mark_unavailable(self, slot, db_session):
        repo = AvailabilityRepository(db_session)
        result = await repo.mark_unavailable(slot.id)
        assert result is True
        refreshed = await repo.get(slot.id)
        assert refreshed.is_available is False

    async def test_mark_available(self, slot, db_session):
        repo = AvailabilityRepository(db_session)
        await repo.mark_unavailable(slot.id)
        result = await repo.mark_available(slot.id)
        assert result is True
        refreshed = await repo.get(slot.id)
        assert refreshed.is_available is True

    async def test_mark_unavailable_nonexistent(self, db_session):
        repo = AvailabilityRepository(db_session)
        result = await repo.mark_unavailable("nonexistent-id")
        assert result is False

    async def test_bulk_create(self, db_session):
        repo = AvailabilityRepository(db_session)
        data = [
            {"slot_date": tomorrow, "slot_time": time(10, 0), "duration_minutes": 30, "is_available": True},
            {"slot_date": tomorrow, "slot_time": time(10, 30), "duration_minutes": 30, "is_available": True},
        ]
        count = await repo.bulk_create(data)
        assert count == 2


class TestBookingRepository:
    async def test_find_by_email(self, slot, db_session):
        from app.repositories.booking_repository import BookingRepository
        from app.models.orm.booking import Booking

        booking = Booking(
            availability_slot_id=slot.id,
            email="test@example.com",
            booking_date=tomorrow,
            booking_time=time(14, 0),
            status="confirmed",
        )
        db_session.add(booking)
        await db_session.flush()

        repo = BookingRepository(db_session)
        results = await repo.find_by_email("test@example.com")
        assert len(results) == 1
        assert results[0].email == "test@example.com"

    async def test_find_by_email_empty(self, db_session):
        from app.repositories.booking_repository import BookingRepository
        repo = BookingRepository(db_session)
        results = await repo.find_by_email("nobody@example.com")
        assert results == []

    async def test_count_active_by_email(self, slot, db_session):
        from app.repositories.booking_repository import BookingRepository
        from app.models.orm.booking import Booking

        for i in range(3):
            b = Booking(
                availability_slot_id=slot.id,
                email="multi@example.com",
                booking_date=tomorrow,
                booking_time=time(14, i),
                status="confirmed",
            )
            db_session.add(b)
        await db_session.flush()

        repo = BookingRepository(db_session)
        count = await repo.count_active_by_email("multi@example.com")
        assert count == 3

    async def test_find_by_slot(self, slot, db_session):
        from app.repositories.booking_repository import BookingRepository
        from app.models.orm.booking import Booking

        booking = Booking(
            availability_slot_id=slot.id,
            email="slot@example.com",
            booking_date=tomorrow,
            booking_time=time(14, 0),
            status="confirmed",
        )
        db_session.add(booking)
        await db_session.flush()

        repo = BookingRepository(db_session)
        found = await repo.find_by_slot(slot.id)
        assert found is not None
        assert found.email == "slot@example.com"

    async def test_paginate(self, db_session):
        from app.repositories.booking_repository import BookingRepository
        from app.models.orm.availability_slot import AvailabilitySlot
        from app.models.orm.booking import Booking

        for i in range(5):
            s = AvailabilitySlot(slot_date=tomorrow, slot_time=time(9, i), duration_minutes=30, is_available=False)
            db_session.add(s)
            await db_session.flush()
            b = Booking(
                availability_slot_id=s.id,
                email="page@example.com",
                booking_date=tomorrow,
                booking_time=time(9, i),
                status="confirmed",
            )
            db_session.add(b)
        await db_session.flush()

        repo = BookingRepository(db_session)
        items, total = await repo.paginate(page=1, limit=3, email="page@example.com")
        assert total == 5
        assert len(items) == 3
