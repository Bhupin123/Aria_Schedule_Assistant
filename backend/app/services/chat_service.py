import re
import traceback

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.state import AgentState
from app.models.orm.conversation import Conversation
from app.models.schemas.chat import ChatResponse, BookingStatus, BookingContextOut, HistoryResponse, MessageRecord


def _friendly_error(exc: Exception) -> str:
    """
    Convert any exception into a user-facing message.
    Never exposes raw exception text, stack traces, or internal details.
    """
    exc_type = type(exc).__name__

    # Groq / OpenAI rate limit (429)
    if exc_type == "RateLimitError" or "rate_limit_exceeded" in str(exc).lower():
        match = re.search(r"try again in ([\d]+m[\d.]+s|[\d.]+ seconds?)", str(exc))
        wait = match.group(1) if match else "a few minutes"
        return (
            f"I'm temporarily unavailable — the AI service is rate-limited right now. "
            f"Please try again in **{wait}**."
        )

    # Groq / OpenAI auth errors
    if exc_type in ("AuthenticationError", "PermissionDeniedError"):
        return "There's a configuration issue with the AI service. Please contact support."

    # Network / timeout
    if exc_type in ("ConnectTimeout", "ReadTimeout", "TimeoutError", "ConnectionError"):
        return "The request timed out. Please check your connection and try again."

    # LangGraph / agent internal errors
    if "langgraph" in str(type(exc).__module__):
        return "I ran into an issue processing your request. Please try rephrasing or try again."

    # Generic fallback — never expose exc details
    return "Something went wrong on my end. Please try again in a moment."


class ChatService:
    def __init__(self, graph, session: AsyncSession):
        self.graph = graph
        self.session = session

    async def process_message(self, thread_id: str, message: str) -> ChatResponse:
        await self._upsert_conversation(thread_id)
        await self.session.commit()

        config = {"configurable": {"thread_id": thread_id}}
        input_state: dict = {
            "messages": [HumanMessage(content=message)],
            "thread_id": thread_id,
            "current_agent": "none",
            "booking_context": None,
            "missing_fields": [],
            "validation_errors": [],
            "available_slots": [],
            "booking_confirmed": False,
            "error": None,
        }

        try:
            print("=" * 80)
            print(f"Thread ID: {thread_id}")
            print(f"User message: {message}")
            print(">>> Starting LangGraph...")

            result: AgentState = await self.graph.ainvoke(
                input_state,
                config=config,
            )

            print(">>> LangGraph completed successfully!")
            print("Result:")
            print(result)
            print("=" * 80)

        except Exception as exc:
            print("=" * 80)
            print(f">>> LangGraph FAILED! ({type(exc).__name__})")
            traceback.print_exc()
            print("=" * 80)

            return ChatResponse(
                thread_id=thread_id,
                response=_friendly_error(exc),
                booking_status=BookingStatus(),
            )

        response_text = self._extract_response(result)
        booking_status = self._build_booking_status(result)
        intent = result.get("intent")

        await self._update_conversation(thread_id, intent, result.get("booking_confirmed", False))

        return ChatResponse(
            thread_id=thread_id,
            response=response_text,
            intent=intent,
            booking_status=booking_status,
            turn_count=result.get("turn_count", 0),
        )

    async def get_history(self, thread_id: str) -> HistoryResponse:
        config = {"configurable": {"thread_id": thread_id}}
        try:
            checkpoint = await self.graph.aget_state(config)
            if not checkpoint or not checkpoint.values:
                return HistoryResponse(thread_id=thread_id)

            state: AgentState = checkpoint.values
            messages = self._format_messages(state.get("messages", []))
            ctx = state.get("booking_context")
            ctx_out = BookingContextOut(**ctx) if ctx else None
            return HistoryResponse(thread_id=thread_id, messages=messages, booking_context=ctx_out)
        except Exception:
            return HistoryResponse(thread_id=thread_id)

    def _extract_response(self, state: AgentState) -> str:
        messages = state.get("messages", [])
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
                return str(msg.content)
        return "I'm not sure how to respond. Could you rephrase that?"

    def _build_booking_status(self, state: AgentState) -> BookingStatus:
        ctx = state.get("booking_context")
        ctx_out = None
        if ctx:
            ctx_out = BookingContextOut(
                normalized_date=ctx.get("normalized_date"),
                normalized_time=ctx.get("normalized_time"),
                email=ctx.get("email"),
                purpose=ctx.get("purpose"),
                booking_id=ctx.get("booking_id"),
                slot_reserved=ctx.get("slot_reserved", False),
                notification_sent=ctx.get("notification_sent", False),
            )
        return BookingStatus(
            booking_confirmed=state.get("booking_confirmed", False),
            booking_context=ctx_out,
            available_slots=state.get("available_slots", []),
            validation_errors=state.get("validation_errors", []),
        )

    def _format_messages(self, messages: list[BaseMessage]) -> list[MessageRecord]:
        result = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                result.append(MessageRecord(role="user", content=str(msg.content)))
            elif isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
                result.append(MessageRecord(role="assistant", content=str(msg.content)))
        return result

    async def _upsert_conversation(self, thread_id: str) -> None:
        existing = await self.session.get(Conversation, thread_id)
        if not existing:
            conv = Conversation(thread_id=thread_id, status="active", message_count=1)
            self.session.add(conv)
        else:
            existing.message_count += 1
        await self.session.flush()

    async def _update_conversation(self, thread_id: str, intent: str | None, confirmed: bool) -> None:
        conv = await self.session.get(Conversation, thread_id)
        if conv:
            if intent:
                conv.last_intent = intent
            if confirmed:
                conv.status = "completed"
            await self.session.flush()