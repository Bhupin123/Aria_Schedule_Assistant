from pydantic import BaseModel, Field
from datetime import date, time


class SlotRead(BaseModel):
    slot_id: str
    date: str
    time: str
    duration_minutes: int

    model_config = {"from_attributes": True}


class AvailabilityResponse(BaseModel):
    date: str
    slots: list[SlotRead]


class SeedRequest(BaseModel):
    date: date
    start_time: time = time(9, 0)
    end_time: time = time(17, 0)
    interval_minutes: int = Field(default=30, ge=15, le=120)


class SeedResponse(BaseModel):
    created: int
