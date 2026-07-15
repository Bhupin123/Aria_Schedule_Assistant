from langchain_core.tools import tool
from app.db.database import get_session
from app.services.booking_service import BookingService, BookingError
from app.repositories.booking_repository import BookingRepository
from app.core.date_utils import normalize_date


@tool
async def cancel_booking(booking_id: str = "", reason: str = "") -> dict:
    """Cancel an existing booking by its ID.
    Args:
        booking_id: The booking ID to cancel
        reason: Optional reason
    """
    if not booking_id or not booking_id.strip():
        return {"status": "error", "reason": "booking_id is required — use list_bookings_by_email or list_bookings_by_date first to get booking IDs"}
    try:
        async with get_session() as session:
            svc = BookingService(session)
            booking = await svc.cancel_booking(booking_id.strip(), reason=reason or None)
        return {"status": "success", "booking_id": booking.id,
                "message": f"Booking {booking.id} has been cancelled."}
    except BookingError as e:
        return {"status": "error", "reason": str(e)}
    except Exception as e:
        return {"status": "error", "reason": str(e)}


@tool
async def list_bookings_by_email(email: str) -> dict:
    """List all confirmed bookings for a specific email address.
    Args:
        email: The email to look up
    """
    if not email or "@" not in email:
        return {"status": "error", "reason": "Valid email required"}
    if "example.com" in email:
        return {"status": "error", "reason": "That looks like a placeholder. Ask the user for their actual email."}
    try:
        async with get_session() as session:
            repo = BookingRepository(session)
            bookings = await repo.find_by_email(email.strip(), status="confirmed")
        if not bookings:
            return {"status": "success", "bookings": [], "count": 0,
                    "message": f"No confirmed bookings for {email}"}
        return {
            "status": "success", "count": len(bookings),
            "bookings": [{"booking_id": b.id, "date": b.booking_date.isoformat(),
                          "time": b.booking_time.strftime("%H:%M"),
                          "purpose": b.purpose, "status": b.status}
                         for b in bookings],
        }
    except Exception as e:
        return {"status": "error", "reason": str(e)}


@tool
async def list_bookings_by_date(date: str) -> dict:
    """List ALL confirmed bookings on a specific date regardless of email.
    Use this when user says 'cancel all bookings on X date' or 'cancel all this weekend'.
    Args:
        date: Date string e.g. 'this saturday', '2026-07-16', 'tomorrow'
    """
    try:
        normalized = normalize_date(date)
    except ValueError as e:
        return {"status": "error", "reason": str(e)}
    try:
        from datetime import date as date_type
        slot_date = date_type.fromisoformat(normalized)
        async with get_session() as session:
            repo = BookingRepository(session)
            bookings = await repo.find_by_date(slot_date, status="confirmed")
        if not bookings:
            return {"status": "success", "bookings": [], "count": 0,
                    "message": f"No confirmed bookings on {normalized}"}
        return {
            "status": "success", "count": len(bookings),
            "bookings": [{"booking_id": b.id, "date": b.booking_date.isoformat(),
                          "time": b.booking_time.strftime("%H:%M"),
                          "email": b.email,
                          "purpose": b.purpose, "status": b.status}
                         for b in bookings],
        }
    except Exception as e:
        return {"status": "error", "reason": str(e)}