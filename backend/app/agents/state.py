from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class BookingContext(TypedDict, total=False):
    raw_date: Optional[str]
    normalized_date: Optional[str]
    raw_time: Optional[str]
    normalized_time: Optional[str]
    email: Optional[str]
    purpose: Optional[str]
    booking_id: Optional[str]
    slot_reserved: bool
    notification_sent: bool
    alternative_slots_offered: list[str]


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    current_agent: str
    intent: Optional[str]
    booking_context: Optional[BookingContext]
    missing_fields: list[str]
    validation_errors: list[str]
    available_slots: list[dict]
    turn_count: int
    booking_confirmed: bool
    error: Optional[str]
    thread_id: str
