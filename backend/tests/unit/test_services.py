import pytest
from datetime import date, time, timedelta
from app.services.booking_service import BookingService, BookingError
from app.services.availability_service import AvailabilityService
from app.models.orm.availability_slot import AvailabilitySlot
from app.models.orm.booking import Booking

tomorrow = date.today() + timedelta(days=1)


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


class TestAvailabilityService:
    async def test_get_slots_for_date(self, seeded_db):
        svc = AvailabilityService(seeded_db)
        slots = await svc.get_slots_for_date(tomorrow)
        assert len(slots) > 0
        assert all(isinstance(s, dict) for s in slots)
        assert "slot_id" in slots[0]
        assert "time" in slots[0]

    async def test_find_slot(self, seeded_db):
        svc = AvailabilityService(seeded_db)
        slot = await svc.find_slot(tomorrow, time(9, 0))
        assert slot is not None

    async def test_find_slot_missing(self, db_session):
        svc = AvailabilityService(db_session)
        slot = await svc.find_slot(date(2099, 1, 1), time(9, 0))
        assert slot is None

    async def test_seed_slots(self, db_session):
        svc = AvailabilityService(db_session)
        count = await svc.seed_slots(tomorrow, time(9, 0), time(11, 0), 30)
        assert count == 4  # 09:00, 09:30, 10:00, 10:30

    async def test_seed_slots_no_duplicates(self, db_session):
        svc = AvailabilityService(db_session)
        # Seed initial batch
        count1 = await svc.seed_slots(tomorrow, time(9, 0), time(11, 0), 60)
        assert count1 == 2  # 09:00, 10:00
        after1 = await svc.get_slots_for_date(tomorrow)
        # Seed exact same range again — should create zero new slots
        count2 = await svc.seed_slots(tomorrow, time(9, 0), time(11, 0), 60)
        assert count2 == 0
        after2 = await svc.get_slots_for_date(tomorrow)
        assert len(after2) == len(after1)

    async def test_release_slot(self, slot, db_session):
        svc = AvailabilityService(db_session)
        slot.is_available = False
        await db_session.flush()
        result = await svc.release_slot(slot.id)
        assert result is True
        slots = await svc.get_slots_for_date(tomorrow)
        assert any(s["slot_id"] == slot.id for s in slots)


class TestBookingService:
    async def test_create_booking(self, slot, db_session):
        svc = BookingService(db_session)
        booking = await svc.create_booking(
            slot_id=slot.id,
            email="user@example.com",
            booking_date=tomorrow,
            booking_time=time(14, 0),
            purpose="Test",
        )
        assert booking.id is not None
        assert booking.status == "confirmed"
        assert booking.email == "user@example.com"

        # Slot should now be unavailable
        from app.repositories.availability_repository import AvailabilityRepository
        repo = AvailabilityRepository(db_session)
        s = await repo.get(slot.id)
        assert s.is_available is False

    async def test_create_booking_conflict(self, slot, db_session):
        svc = BookingService(db_session)
        await svc.create_booking(slot.id, "a@example.com", tomorrow, time(14, 0))
        with pytest.raises(BookingError, match="already booked"):
            await svc.create_booking(slot.id, "b@example.com", tomorrow, time(14, 0))

    async def test_max_active_bookings_enforced(self, db_session):
        from app.core.config import settings
        svc = BookingService(db_session)
        avail_svc = AvailabilityService(db_session)

        # Seed enough slots
        await avail_svc.seed_slots(tomorrow, time(9, 0), time(17, 0), 30)
        slots = await avail_svc.get_slots_for_date(tomorrow)

        email = "heavy@example.com"
        for i in range(settings.MAX_ACTIVE_BOOKINGS_PER_EMAIL):
            s = slots[i]
            h, m = map(int, s["time"].split(":"))
            await svc.create_booking(s["slot_id"], email, tomorrow, time(h, m))

        with pytest.raises(BookingError, match="Maximum"):
            s = slots[settings.MAX_ACTIVE_BOOKINGS_PER_EMAIL]
            h, m = map(int, s["time"].split(":"))
            await svc.create_booking(s["slot_id"], email, tomorrow, time(h, m))

    async def test_cancel_booking(self, slot, db_session):
        svc = BookingService(db_session)
        booking = await svc.create_booking(slot.id, "cancel@example.com", tomorrow, time(14, 0))
        cancelled = await svc.cancel_booking(booking.id, reason="Changed my mind")

        assert cancelled.status == "cancelled"
        assert cancelled.cancelled_reason == "Changed my mind"

        # Slot released
        from app.repositories.availability_repository import AvailabilityRepository
        repo = AvailabilityRepository(db_session)
        s = await repo.get(slot.id)
        assert s.is_available is True

    async def test_cancel_nonexistent_raises(self, db_session):
        svc = BookingService(db_session)
        with pytest.raises(BookingError, match="not found"):
            await svc.cancel_booking("nonexistent-id")

    async def test_cancel_already_cancelled_raises(self, slot, db_session):
        svc = BookingService(db_session)
        booking = await svc.create_booking(slot.id, "c@example.com", tomorrow, time(14, 0))
        await svc.cancel_booking(booking.id)
        with pytest.raises(BookingError, match="confirmed"):
            await svc.cancel_booking(booking.id)

    async def test_list_bookings_paginated(self, db_session):
        avail_svc = AvailabilityService(db_session)
        await avail_svc.seed_slots(tomorrow, time(9, 0), time(14, 0), 30)
        slots = await avail_svc.get_slots_for_date(tomorrow)

        svc = BookingService(db_session)
        for i in range(4):
            s = slots[i]
            h, m = map(int, s["time"].split(":"))
            await svc.create_booking(s["slot_id"], "list@example.com", tomorrow, time(h, m))

        items, total = await svc.list_bookings(page=1, limit=2, email="list@example.com")
        assert total == 4
        assert len(items) == 2
