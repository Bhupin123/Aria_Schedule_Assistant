"""
Shared fixtures for all tests.
FakeLLM lets us test the full LangGraph graph without real API calls.
"""
import pytest
import pytest_asyncio
from typing import Iterator
from unittest.mock import AsyncMock, MagicMock

from pydantic import ConfigDict
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.base import Base
import app.models.orm  # noqa: F401 — register all ORM models


# ---------------------------------------------------------------------------
# FakeLLM — deterministic LLM for tests, zero API calls
# ---------------------------------------------------------------------------

class FakeLLM(BaseChatModel):
    """Returns canned responses in sequence. Raises on exhaustion."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    responses: list[BaseMessage]
    _index: int = 0

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if self._index >= len(self.responses):
            raise AssertionError(
                f"FakeLLM exhausted after {len(self.responses)} calls. "
                "Add more canned responses."
            )
        msg = self.responses[self._index]
        self._index += 1
        return ChatResult(generations=[ChatGeneration(message=msg)])

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        return self._generate(messages, stop, run_manager, **kwargs)

    @property
    def _llm_type(self) -> str:
        return "fake"

    def bind_tools(self, tools, **kwargs):
        """Return self — FakeLLM ignores tool binding."""
        return self


# ---------------------------------------------------------------------------
# In-memory async SQLite session
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()

    await engine.dispose()


# ---------------------------------------------------------------------------
# Seed helper
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def seeded_db(db_session: AsyncSession):
    """DB session with a week of availability slots."""
    from datetime import date, time, timedelta
    from app.models.orm.availability_slot import AvailabilitySlot

    today = date.today()
    slots = []
    for day in range(1, 6):
        d = today + timedelta(days=day)
        if d.weekday() >= 5:
            continue
        for h in [9, 10, 14, 15]:
            slots.append(AvailabilitySlot(
                slot_date=d,
                slot_time=time(h, 0),
                duration_minutes=30,
                is_available=True,
            ))

    db_session.add_all(slots)
    await db_session.flush()
    yield db_session


# ---------------------------------------------------------------------------
# Patch DB session used inside tools
# ---------------------------------------------------------------------------

@pytest.fixture
def patch_get_session(db_session):
    """Patch get_session in every tool module that imports it directly."""
    from contextlib import asynccontextmanager
    import app.tools.check_availability as ca_mod
    import app.tools.reserve_slot as rs_mod
    import app.tools.send_notification as sn_mod
    import app.services.booking_service as bs_mod
    import app.services.availability_service as as_mod
    import app.services.notification_service as ns_mod

    @asynccontextmanager
    async def _fake():
        yield db_session

    originals = {}
    for mod in (ca_mod, rs_mod, sn_mod):
        if hasattr(mod, 'get_session'):
            originals[mod] = mod.get_session
            mod.get_session = _fake

    yield

    for mod, orig in originals.items():
        mod.get_session = orig
