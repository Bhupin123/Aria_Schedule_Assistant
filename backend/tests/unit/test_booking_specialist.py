import json
import pytest
from langchain_core.messages import ToolMessage, AIMessage, HumanMessage
from app.agents.booking_specialist import (
    _compute_missing_fields,
    _format_collected,
    _extract_context_from_messages,
)
from app.agents.state import BookingContext


def _ctx(**kwargs) -> BookingContext:
    defaults: BookingContext = {
        "slot_reserved": False,
        "notification_sent": False,
        "alternative_slots_offered": [],
    }
    defaults.update(kwargs)
    return defaults


class TestComputeMissingFields:
    def test_all_missing_when_no_context(self):
        assert set(_compute_missing_fields(None)) == {"date", "time", "email"}

    def test_only_email_missing(self):
        ctx = _ctx(normalized_date="2025-01-16", normalized_time="14:00")
        assert _compute_missing_fields(ctx) == ["email"]

    def test_nothing_missing_when_all_collected(self):
        ctx = _ctx(normalized_date="2025-01-16", normalized_time="14:00", email="u@x.com")
        assert _compute_missing_fields(ctx) == []

    def test_date_and_time_missing(self):
        ctx = _ctx(email="u@x.com")
        missing = _compute_missing_fields(ctx)
        assert "date" in missing
        assert "time" in missing
        assert "email" not in missing


class TestFormatCollected:
    def test_empty_context_shows_nothing(self):
        assert _format_collected(None) == "nothing yet"

    def test_partial_context(self):
        ctx = _ctx(normalized_date="2025-01-16", email="u@x.com")
        result = _format_collected(ctx)
        assert "2025-01-16" in result
        assert "u@x.com" in result
        assert "time" not in result


class TestExtractContextFromMessages:
    def _tool_message(self, tool_name: str, data: dict) -> ToolMessage:
        return ToolMessage(
            content=json.dumps(data),
            tool_call_id="call_1",
            name=tool_name,
        )

    def test_reserve_slot_success_updates_context(self):
        msgs = [
            self._tool_message("reserve_slot", {
                "status": "success",
                "booking_id": "b-123",
                "date": "2025-01-16",
                "time": "14:00",
                "email": "u@x.com",
            })
        ]
        ctx = _extract_context_from_messages(msgs, None)
        assert ctx["booking_id"] == "b-123"
        assert ctx["slot_reserved"] is True
        assert ctx["email"] == "u@x.com"
        assert ctx["normalized_date"] == "2025-01-16"

    def test_notification_success_sets_flag(self):
        msgs = [
            self._tool_message("send_booking_notification", {"status": "success"})
        ]
        ctx = _extract_context_from_messages(msgs, None)
        assert ctx["notification_sent"] is True

    def test_failed_tool_does_not_update_context(self):
        msgs = [
            self._tool_message("reserve_slot", {"status": "error", "reason": "slot taken"})
        ]
        ctx = _extract_context_from_messages(msgs, None)
        assert not ctx.get("slot_reserved", False)
        assert ctx.get("booking_id") is None

    def test_preserves_existing_context(self):
        existing = _ctx(normalized_date="2025-01-16", email="u@x.com")
        msgs = [
            self._tool_message("send_booking_notification", {"status": "success"})
        ]
        ctx = _extract_context_from_messages(msgs, existing)
        assert ctx["normalized_date"] == "2025-01-16"
        assert ctx["email"] == "u@x.com"
        assert ctx["notification_sent"] is True

    def test_non_tool_messages_ignored(self):
        msgs = [
            HumanMessage(content="I want 2pm"),
            AIMessage(content="What is your email?"),
        ]
        ctx = _extract_context_from_messages(msgs, None)
        assert not ctx.get("slot_reserved", False)
