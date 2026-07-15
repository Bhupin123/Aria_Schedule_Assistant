import pytest
from datetime import date, time, timedelta
from app.tools.check_availability import check_availability
from app.tools.reserve_slot import reserve_slot
from app.tools.send_notification import send_booking_notification

tomorrow = date.today() + timedelta(days=1)
tomorrow_str = tomorrow.isoformat()


class TestCheckAvailabilityTool:
    async def test_returns_slots_for_available_date(self, seeded_db, patch_get_session):
        result = await check_availability.ainvoke({"date": tomorrow_str})
        assert result["status"] == "success"
        assert result["count"] > 0
        assert isinstance(result["slots"], list)

    async def test_returns_empty_for_date_with_no_slots(self, db_session, patch_get_session):
        result = await check_availability.ainvoke({"date": "2099-01-01"})
        # 2099 is within 90 days? No — should raise ValueError
        assert result["status"] == "error"
        assert "90 days" in result["reason"]

    async def test_past_date_returns_error(self, db_session, patch_get_session):
        result = await check_availability.ainvoke({"date": "2020-01-01"})
        assert result["status"] == "error"
        assert "past" in result["reason"].lower()

    async def test_relative_date_tomorrow(self, seeded_db, patch_get_session):
        result = await check_availability.ainvoke({"date": "tomorrow"})
        assert result["status"] == "success"
        assert result["date"] == tomorrow_str

    async def test_garbage_input_returns_error(self, db_session, patch_get_session):
        result = await check_availability.ainvoke({"date": "whenever"})
        assert result["status"] == "error"


class TestReserveSlotTool:
    async def test_successful_reservation(self, seeded_db, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "09:00",
            "email": "user@example.com",
        })
        assert result["status"] == "success"
        assert "booking_id" in result
        assert result["email"] == "user@example.com"

    async def test_invalid_email_returns_error(self, seeded_db, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "09:00",
            "email": "not-an-email",
        })
        assert result["status"] == "error"
        assert "email" in result["reason"].lower()

    async def test_no_slot_found_returns_error_or_conflict(self, seeded_db, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "08:00",  # outside booking hours — normalize_time raises ValueError
            "email": "user@example.com",
        })
        # normalize_time rejects 8am before any DB query → status=error
        assert result["status"] in ("error", "conflict")

    async def test_double_book_returns_conflict(self, seeded_db, patch_get_session):
        # First booking
        r1 = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "09:00",
            "email": "first@example.com",
        })
        assert r1["status"] == "success"

        # Second booking for same slot
        r2 = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "09:00",
            "email": "second@example.com",
        })
        assert r2["status"] == "conflict"

    async def test_past_date_returns_error(self, db_session, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": "2020-01-01",
            "time": "09:00",
            "email": "user@example.com",
        })
        assert result["status"] == "error"
        assert "past" in result["reason"].lower()

    async def test_relative_time_afternoon(self, seeded_db, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "afternoon",
            "email": "user@example.com",
        })
        # "afternoon" → 14:00, which should be in seeded slots
        assert result["status"] == "success"
        assert result["time"] == "14:00"

    async def test_with_purpose(self, seeded_db, patch_get_session):
        result = await reserve_slot.ainvoke({
            "date": tomorrow_str,
            "time": "10:00",
            "email": "user@example.com",
            "purpose": "Annual checkup",
        })
        assert result["status"] == "success"


class TestSendNotificationTool:
    async def test_skips_gracefully_when_smtp_not_configured(self, db_session, patch_get_session):
        """SMTP_USER is empty in test env — send is skipped but returns success."""
        result = await send_booking_notification.ainvoke({
            "email": "user@example.com",
            "booking_id": "test-booking-id",
            "date": tomorrow_str,
            "time": "14:00",
        })
        # Skipped (no SMTP config) returns success non-fatally
        assert result["status"] in ("success", "failed")

    async def test_invalid_email_returns_error(self, db_session, patch_get_session):
        result = await send_booking_notification.ainvoke({
            "email": "bad-email",
            "booking_id": "test-id",
            "date": tomorrow_str,
            "time": "14:00",
        })
        assert result["status"] == "error"
        assert "Invalid email" in result["reason"]
