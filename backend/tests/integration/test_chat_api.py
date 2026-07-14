"""
Integration tests: full HTTP request/response cycle.
Uses FakeLLM + MemorySaver (no Groq, no disk) + in-memory SQLite.
"""
import json
import pytest
from datetime import date, time, timedelta
from contextlib import asynccontextmanager, contextmanager

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import MemorySaver
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from tests.conftest import FakeLLM
from app.db.base import Base
import app.models.orm  # noqa: F401


# ---------------------------------------------------------------------------
# Test app factory — yields an active TestClient inside a context manager
# ---------------------------------------------------------------------------

@contextmanager
def app_client(triage_reply: dict, booking_replies: list):
    """
    Context manager that:
      1. Builds an in-memory SQLite DB with seeded availability
      2. Patches async_session_factory so ALL DB access (deps + tools) uses test DB
      3. Patches FakeLLM singletons
      4. Compiles LangGraph with MemorySaver
      5. Starts the TestClient (triggering lifespan, which sets app.state.graph)
      6. Yields the live client
    """
    import app.agents.triage_agent as ta_mod
    import app.agents.booking_specialist as bs_mod
    import app.db.database as db_mod

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_sf = async_sessionmaker(engine, expire_on_commit=False)

    # -----------------------------------------------------------------------
    # Patch async_session_factory at the db module level.
    # Both get_db_session() and get_session() read this name at call-time,
    # so ONE patch propagates to all consumers including FastAPI Depends and tools.
    # -----------------------------------------------------------------------
    original_sf = db_mod.async_session_factory

    @asynccontextmanager
    async def _lifespan(app):
        # Schema
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Seed availability for next 5 weekdays
        today = date.today()
        from app.models.orm.availability_slot import AvailabilitySlot
        async with test_sf() as s:
            for offset in range(1, 8):
                d = today + timedelta(days=offset)
                if d.weekday() >= 5:
                    continue
                for h in [9, 10, 14, 15]:
                    s.add(AvailabilitySlot(
                        slot_date=d, slot_time=time(h, 0),
                        duration_minutes=30, is_available=True,
                    ))
            await s.commit()

        # Patch the factory — all get_db_session / get_session calls now use test_sf
        db_mod.async_session_factory = test_sf

        # Inject fake LLMs
        ta_mod._llm = FakeLLM(
            responses=[AIMessage(content=json.dumps(triage_reply))] * 30
        )
        bs_mod._llm_with_tools = FakeLLM(responses=list(booking_replies) * 10)

        # Compile graph with in-memory checkpoint (no disk I/O)
        from app.agents.graph import create_graph
        app.state.graph = create_graph(MemorySaver())
        yield

        # Restore original factory and dispose test engine
        db_mod.async_session_factory = original_sf
        await engine.dispose()

    from app.main import app as fastapi_app
    fastapi_app.router.lifespan_context = _lifespan

    with TestClient(fastapi_app, raise_server_exceptions=False) as client:
        yield client


# ---------------------------------------------------------------------------
# Convenience shortcuts
# ---------------------------------------------------------------------------

def general_client():
    return app_client(
        triage_reply={"intent": "general", "confidence": 0.95,
                      "reply": "I'm a scheduling assistant!"},
        booking_replies=[AIMessage(content="How can I help?")],
    )


def booking_client():
    return app_client(
        triage_reply={"intent": "booking", "confidence": 0.95, "reply": None},
        booking_replies=[AIMessage(content="What's your email address?")],
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_liveness(self):
        with general_client() as c:
            r = c.get("/health")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"

    def test_db_readiness(self):
        with general_client() as c:
            r = c.get("/health/db")
            assert r.status_code == 200
            assert "latency_ms" in r.json()


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class TestChatMessages:
    def test_create_thread_returns_uuid(self):
        with general_client() as c:
            r = c.post("/api/v1/chat/threads")
            assert r.status_code == 201
            tid = r.json()["thread_id"]
            assert len(tid) == 36
            assert tid.count("-") == 4

    def test_general_intent_returns_response(self):
        with general_client() as c:
            r = c.post("/api/v1/chat/messages", json={
                "thread_id": "t-gen-001",
                "message": "What is this service?",
            })
            assert r.status_code == 200
            data = r.json()
            assert data["response"]
            assert data["intent"] == "general"
            assert data["booking_status"]["booking_confirmed"] is False

    def test_booking_intent_routes_to_specialist(self):
        with booking_client() as c:
            r = c.post("/api/v1/chat/messages", json={
                "thread_id": "t-book-001",
                "message": "I want to book an appointment",
            })
            assert r.status_code == 200
            data = r.json()
            assert data["intent"] == "booking"
            assert len(data["response"]) > 0

    def test_multi_turn_increments_turn_count(self):
        with booking_client() as c:
            tid = "t-multi-001"
            r1 = c.post("/api/v1/chat/messages", json={
                "thread_id": tid, "message": "Book me for tomorrow"
            })
            assert r1.status_code == 200

            r2 = c.post("/api/v1/chat/messages", json={
                "thread_id": tid, "message": "user@example.com"
            })
            assert r2.status_code == 200
            assert r2.json()["turn_count"] > r1.json()["turn_count"]

    def test_message_too_long_returns_422(self):
        with general_client() as c:
            r = c.post("/api/v1/chat/messages", json={
                "thread_id": "t1", "message": "x" * 2001,
            })
            assert r.status_code == 422

    def test_empty_message_returns_422(self):
        with general_client() as c:
            r = c.post("/api/v1/chat/messages", json={
                "thread_id": "t1", "message": "",
            })
            assert r.status_code == 422

    def test_missing_thread_id_returns_422(self):
        with general_client() as c:
            r = c.post("/api/v1/chat/messages", json={"message": "hello"})
            assert r.status_code == 422

    def test_history_empty_for_new_thread(self):
        with general_client() as c:
            r = c.get("/api/v1/chat/threads/brand-new-xyz/history")
            assert r.status_code == 200
            assert r.json()["messages"] == []
            assert r.json()["thread_id"] == "brand-new-xyz"

    def test_history_populated_after_message(self):
        with general_client() as c:
            tid = "t-history-001"
            c.post("/api/v1/chat/messages", json={
                "thread_id": tid, "message": "Hello",
            })
            r = c.get(f"/api/v1/chat/threads/{tid}/history")
            assert r.status_code == 200
            msgs = r.json()["messages"]
            assert any(m["role"] == "user" for m in msgs)
            assert any(m["role"] == "assistant" for m in msgs)

    def test_delete_thread_returns_204(self):
        with general_client() as c:
            r = c.delete("/api/v1/chat/threads/any-thread")
            assert r.status_code == 204


# ---------------------------------------------------------------------------
# Availability
# ---------------------------------------------------------------------------

class TestAvailability:
    @staticmethod
    def _tomorrow():
        return (date.today() + timedelta(days=1)).isoformat()

    def test_get_slots_for_seeded_date(self):
        with general_client() as c:
            r = c.get(f"/api/v1/availability?date={self._tomorrow()}")
            assert r.status_code == 200
            data = r.json()
            assert data["date"] == self._tomorrow()
            assert len(data["slots"]) > 0
            slot = data["slots"][0]
            assert "slot_id" in slot
            assert "time" in slot
            assert "duration_minutes" in slot

    def test_relative_date_tomorrow(self):
        with general_client() as c:
            r = c.get("/api/v1/availability?date=tomorrow")
            assert r.status_code == 200
            assert r.json()["date"] == self._tomorrow()

    def test_past_date_returns_400(self):
        with general_client() as c:
            r = c.get("/api/v1/availability?date=2020-06-15")
            assert r.status_code == 400

    def test_seed_creates_correct_count(self):
        with general_client() as c:
            future = (date.today() + timedelta(days=15)).isoformat()
            r = c.post("/api/v1/availability/seed", json={
                "date": future,
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "interval_minutes": 30,
            })
            assert r.status_code == 201
            # 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 = 6
            assert r.json()["created"] == 6

    def test_seed_idempotent(self):
        with general_client() as c:
            future = (date.today() + timedelta(days=20)).isoformat()
            body = {"date": future, "start_time": "09:00:00",
                    "end_time": "10:00:00", "interval_minutes": 60}
            c.post("/api/v1/availability/seed", json=body)
            r2 = c.post("/api/v1/availability/seed", json=body)
            assert r2.status_code == 201
            assert r2.json()["created"] == 0


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class TestBookings:
    def test_list_empty_initially(self):
        with general_client() as c:
            r = c.get("/api/v1/bookings")
            assert r.status_code == 200
            data = r.json()
            assert data["items"] == []
            assert data["total"] == 0
            assert data["page"] == 1

    def test_get_nonexistent_returns_404(self):
        with general_client() as c:
            r = c.get("/api/v1/bookings/does-not-exist")
            assert r.status_code == 404

    def test_cancel_nonexistent_returns_400(self):
        with general_client() as c:
            r = c.delete("/api/v1/bookings/does-not-exist")
            assert r.status_code == 400

    def test_pagination_params_accepted(self):
        with general_client() as c:
            r = c.get("/api/v1/bookings?page=1&limit=5")
            assert r.status_code == 200
            assert r.json()["page"] == 1

    def test_invalid_page_zero_returns_422(self):
        with general_client() as c:
            r = c.get("/api/v1/bookings?page=0")
            assert r.status_code == 422
