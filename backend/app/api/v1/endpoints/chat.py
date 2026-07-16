from fastapi import APIRouter, Depends, HTTPException, Query, Security
from fastapi.security import APIKeyHeader
from typing import Optional
from app.api.dependencies import get_booking_service
from app.services.booking_service import BookingService, BookingError
from app.models.schemas.booking import BookingRead, BookingCancel, PaginatedBookings
from app.core.config import settings
import math

router = APIRouter(prefix="/bookings", tags=["bookings"])

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: Optional[str] = Security(api_key_header)):
    # If no key is configured, skip auth (dev mode)
    if not settings.BOOKINGS_API_KEY:
        return
    if api_key != settings.BOOKINGS_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key.")


@router.get("", response_model=PaginatedBookings, dependencies=[Depends(verify_api_key)])
async def list_bookings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    email: Optional[str] = None,
    status: Optional[str] = None,
    svc: BookingService = Depends(get_booking_service),
):
    items, total = await svc.list_bookings(page=page, limit=limit, email=email, status=status)
    pages = math.ceil(total / limit) if total else 0
    return PaginatedBookings(
        items=[BookingRead.model_validate(b) for b in items],
        total=total,
        page=page,
        pages=pages,
    )


@router.get("/{booking_id}", response_model=BookingRead, dependencies=[Depends(verify_api_key)])
async def get_booking(
    booking_id: str,
    svc: BookingService = Depends(get_booking_service),
):
    booking = await svc.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingRead.model_validate(booking)


@router.delete("/{booking_id}", response_model=BookingRead, dependencies=[Depends(verify_api_key)])
async def cancel_booking_delete(
    booking_id: str,
    body: BookingCancel = BookingCancel(),
    svc: BookingService = Depends(get_booking_service),
):
    try:
        booking = await svc.cancel_booking(booking_id, reason=body.reason)
        return BookingRead.model_validate(booking)
    except BookingError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/cancel", response_model=BookingRead, dependencies=[Depends(verify_api_key)])
async def cancel_booking_post(
    booking_id: str,
    svc: BookingService = Depends(get_booking_service),
):
    try:
        booking = await svc.cancel_booking(booking_id, reason="Cancelled via dashboard")
        return BookingRead.model_validate(booking)
    except BookingError as e:
        raise HTTPException(status_code=400, detail=str(e))