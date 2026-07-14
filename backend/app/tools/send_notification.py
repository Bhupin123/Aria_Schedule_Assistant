from langchain_core.tools import tool
from email_validator import validate_email, EmailNotValidError
from app.db.database import get_session
from app.services.notification_service import NotificationService


@tool
async def send_booking_notification(email: str, booking_id: str, date: str, time: str) -> dict:
    """Send a booking confirmation email to the user.

    Args:
        email: Recipient email address
        booking_id: The confirmed booking ID
        date: Appointment date (ISO format)
        time: Appointment time (HH:MM format)

    Returns:
        Dictionary with send status.
    """
    try:
        valid = validate_email(email, check_deliverability=False)
        clean_email = valid.normalized
    except EmailNotValidError:
        return {"status": "error", "reason": f"Invalid email: {email}"}

    try:
        async with get_session() as session:
            svc = NotificationService(session)
            success = await svc.send_booking_confirmation(
                booking_id=booking_id,
                email=clean_email,
                details={"date": date, "time": time, "booking_id": booking_id},
            )
        return {"status": "success" if success else "failed", "booking_id": booking_id}
    except Exception as e:
        return {"status": "error", "reason": str(e)}
