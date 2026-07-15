from langchain_core.tools import tool
from email_validator import validate_email, EmailNotValidError
from app.db.database import async_session_factory
from app.services.booking_service import BookingService, BookingError
from app.services.availability_service import AvailabilityService
from app.core.date_utils import normalize_date, normalize_time


@tool
async def reserve_slot(date: str, time: str, email: str, purpose: str = "") -> dict:
    """Reserve an appointment slot.

    Args:
        date: Date string (e.g., 'tomorrow', '2025-01-15')
        time: Time string (e.g., '2pm', '14:00', 'afternoon')
        email: User's email address
        purpose: Optional description of the appointment

    Returns:
        Dictionary with booking confirmation or error details.
    """
    try:
        normalized_date = normalize_date(date)
    except ValueError as e:
        return {"status": "error", "reason": str(e)}

    try:
        normalized_time = normalize_time(time)
    except ValueError as e:
        return {"status": "error", "reason": str(e)}

    try:
        valid = validate_email(email, check_deliverability=False)
        clean_email = valid.normalized
    except EmailNotValidError:
        return {"status": "error", "reason": f"'{email}' is not a valid email address."}

    try:
        from datetime import date as date_type, time as time_type
        slot_date = date_type.fromisoformat(normalized_date)
        h, m = map(int, normalized_time.split(":"))
        slot_time = time_type(h, m)

        async with async_session_factory() as session:
            avail_service = AvailabilityService(session)
            slot = await avail_service.find_slot(slot_date, slot_time)

            if not slot:
                return {
                    "status": "conflict",
                    "reason": f"No slot found at {normalized_time} on {normalized_date}. Please check availability first.",
                }
            if not slot.is_available:
                return {
                    "status": "conflict",
                    "reason": f"The slot at {normalized_time} on {normalized_date} was just taken. Please choose another time.",
                }

            booking_service = BookingService(session)
            booking = await booking_service.create_booking(
                slot_id=slot.id,
                email=clean_email,
                booking_date=slot_date,
                booking_time=slot_time,
                purpose=purpose or None,
            )
            await session.commit()

        return {
            "status": "success",
            "booking_id": booking.id,
            "date": normalized_date,
            "time": normalized_time,
            "email": clean_email,
            "purpose": purpose or None,
        }
    except BookingError as e:
        return {"status": "error", "reason": str(e)}
    except Exception as e:
        return {"status": "error", "reason": f"Reservation failed: {str(e)}"}