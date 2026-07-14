from fastapi import APIRouter, Depends, HTTPException
from datetime import date as date_type
from app.api.dependencies import get_availability_service
from app.services.availability_service import AvailabilityService
from app.models.schemas.availability import AvailabilityResponse, SlotRead, SeedRequest, SeedResponse
from app.core.date_utils import normalize_date

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
async def get_availability(
    date: str,
    svc: AvailabilityService = Depends(get_availability_service),
):
    try:
        normalized = normalize_date(date)
        slot_date = date_type.fromisoformat(normalized)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    slots = await svc.get_slots_for_date(slot_date)
    return AvailabilityResponse(
        date=normalized,
        slots=[SlotRead(slot_id=s["slot_id"], date=s["date"], time=s["time"], duration_minutes=s["duration_minutes"]) for s in slots],
    )


@router.post("/seed", response_model=SeedResponse, status_code=201)
async def seed_slots(
    body: SeedRequest,
    svc: AvailabilityService = Depends(get_availability_service),
):
    created = await svc.seed_slots(
        slot_date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        interval_minutes=body.interval_minutes,
    )
    return SeedResponse(created=created)
