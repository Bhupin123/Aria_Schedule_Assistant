from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    thread_id: str = Field(min_length=1, max_length=36)
    message: str = Field(min_length=1, max_length=2000)


class BookingContextOut(BaseModel):
    normalized_date: Optional[str] = None
    normalized_time: Optional[str] = None
    email: Optional[str] = None
    purpose: Optional[str] = None
    booking_id: Optional[str] = None
    slot_reserved: bool = False
    notification_sent: bool = False


class BookingStatus(BaseModel):
    booking_confirmed: bool = False
    booking_context: Optional[BookingContextOut] = None
    available_slots: list[dict] = []
    validation_errors: list[str] = []


class ChatResponse(BaseModel):
    thread_id: str
    response: str
    intent: Optional[str] = None
    booking_status: BookingStatus = BookingStatus()
    turn_count: int = 0


class ThreadCreate(BaseModel):
    thread_id: str


class MessageRecord(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    thread_id: str
    messages: list[MessageRecord] = []
    booking_context: Optional[BookingContextOut] = None
