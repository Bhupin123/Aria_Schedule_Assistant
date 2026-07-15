from pydantic import BaseModel, EmailStr, Field
from datetime import date, time, datetime
from typing import Optional


class BookingRead(BaseModel):
    id: str
    email: str
    booking_date: date
    booking_time: time
    purpose: Optional[str] = None
    status: str
    cancelled_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class PaginatedBookings(BaseModel):
    items: list[BookingRead]
    total: int
    page: int
    pages: int
