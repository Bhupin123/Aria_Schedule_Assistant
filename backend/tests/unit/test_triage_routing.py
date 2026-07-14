import pytest
from app.agents.graph import route_from_triage, route_from_booking
from app.agents.state import AgentState
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END


def _state(**kwargs) -> AgentState:
    defaults: AgentState = {
        "messages": [],
        "current_agent": "triage",
        "intent": None,
        "booking_context": None,
        "missing_fields": [],
        "validation_errors": [],
        "available_slots": [],
        "turn_count": 0,
        "booking_confirmed": False,
        "error": None,
        "thread_id": "test-thread",
    }
    defaults.update(kwargs)
    return defaults


class TestRouteFromTriage:
    def test_booking_intent_routes_to_specialist(self):
        state = _state(intent="booking")
        assert route_from_triage(state) == "booking_specialist"

    def test_cancel_intent_routes_to_specialist(self):
        state = _state(intent="cancel")
        assert route_from_triage(state) == "booking_specialist"

    def test_reschedule_intent_routes_to_specialist(self):
        state = _state(intent="reschedule")
        assert route_from_triage(state) == "booking_specialist"

    def test_general_intent_routes_to_end(self):
        state = _state(intent="general")
        assert route_from_triage(state) == END

    def test_check_intent_routes_to_end(self):
        state = _state(intent="check")
        assert route_from_triage(state) == END

    def test_none_intent_routes_to_end(self):
        state = _state(intent=None)
        assert route_from_triage(state) == END


class TestRouteFromBooking:
    def test_no_tool_calls_routes_to_end(self):
        state = _state(messages=[
            HumanMessage(content="hello"),
            AIMessage(content="What time works for you?"),
        ])
        assert route_from_booking(state) == END

    def test_tool_calls_routes_to_tools(self):
        msg = AIMessage(
            content="",
            tool_calls=[{
                "id": "call_1",
                "name": "check_availability",
                "args": {"date": "2025-01-16"},
                "type": "tool_call",
            }],
        )
        state = _state(messages=[HumanMessage(content="book me"), msg])
        assert route_from_booking(state) == "tools"

    def test_empty_messages_routes_to_end(self):
        state = _state(messages=[])
        assert route_from_booking(state) == END

    def test_empty_tool_calls_list_routes_to_end(self):
        msg = AIMessage(content="I'll help you!", tool_calls=[])
        state = _state(messages=[msg])
        assert route_from_booking(state) == END
