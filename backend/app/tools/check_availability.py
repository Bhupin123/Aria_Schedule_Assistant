from langchain_core.tools import tool
from app.db.database import get_session
from app.services.availability_service import AvailabilityService
from app.core.date_utils import normalize_date


@tool
async def check_availability(date: str) -> dict:
    """Check available appointment slots for a given date.
    
    Args:
        date: Any human-readable date string (e.g., 'tomorrow', 'next Monday', '2025-01-15')
    
    Returns:
        Dictionary with status, date, and list of available times.
    """
    try:
        normalized = normalize_date(date)
    except ValueError as e:
        return {"status": "error", "reason": str(e)}

    try:
        from datetime import date as date_type
        slot_date = date_type.fromisoformat(normalized)
        async with get_session() as session:
            service = AvailabilityService(session)
            slots = await service.get_slots_for_date(slot_date)
        return {
            "status": "success",
            "date": normalized,
            "count": len(slots),
            "available_times": [s["time"] for s in slots],
        }
    except Exception as e:
        return {"status": "error", "reason": f"Failed to check availability: {str(e)}"}