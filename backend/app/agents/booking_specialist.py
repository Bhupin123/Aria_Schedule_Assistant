import asyncio
import json
from datetime import date
from groq import RateLimitError
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_groq import ChatGroq
from app.agents.state import AgentState, BookingContext
from app.agents.prompts import BOOKING_SPECIALIST_SYSTEM_PROMPT
from app.core.config import settings
from app.tools.check_availability import check_availability
from app.tools.reserve_slot import reserve_slot
from app.tools.send_notification import send_booking_notification

TOOLS = [check_availability, reserve_slot, send_booking_notification]

_llm_with_tools = None


def get_llm_with_tools() -> ChatGroq:
    global _llm_with_tools
    if _llm_with_tools is None:
        llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0,
        )
        _llm_with_tools = llm.bind_tools(TOOLS)
    return _llm_with_tools


def _compute_missing_fields(ctx: BookingContext | None) -> list[str]:
    if ctx is None:
        return ["date", "time", "email"]
    missing = []
    if not ctx.get("normalized_date"):
        missing.append("date")
    if not ctx.get("normalized_time"):
        missing.append("time")
    if not ctx.get("email"):
        missing.append("email")
    return missing


def _format_collected(ctx: BookingContext | None) -> str:
    if not ctx:
        return "nothing yet"
    parts = []
    if ctx.get("normalized_date"):
        parts.append(f"date={ctx['normalized_date']}")
    if ctx.get("normalized_time"):
        parts.append(f"time={ctx['normalized_time']}")
    if ctx.get("email"):
        parts.append(f"email={ctx['email']}")
    if ctx.get("purpose"):
        parts.append(f"purpose={ctx['purpose']}")
    return ", ".join(parts) if parts else "nothing yet"


def _extract_context_from_messages(
    messages: list, current_ctx: BookingContext | None
) -> BookingContext:
    ctx: BookingContext = dict(current_ctx) if current_ctx else {
        "slot_reserved": False,
        "notification_sent": False,
        "alternative_slots_offered": [],
    }

    for msg in messages:
        if isinstance(msg, ToolMessage):
            try:
                data = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            except Exception:
                continue

            tool_name = getattr(msg, "name", "") or ""

            if "reserve_slot" in tool_name and data.get("status") == "success":
                ctx["booking_id"] = data.get("booking_id")
                ctx["normalized_date"] = data.get("date", ctx.get("normalized_date"))
                ctx["normalized_time"] = data.get("time", ctx.get("normalized_time"))
                ctx["email"] = data.get("email", ctx.get("email"))
                ctx["slot_reserved"] = True

            elif "send_booking_notification" in tool_name and data.get("status") == "success":
                ctx["notification_sent"] = True

    return ctx


async def booking_specialist_node(state: AgentState) -> dict:
    if state.get("turn_count", 0) > settings.MAX_TURNS:
        return {
            "messages": [AIMessage(content="I've reached the maximum conversation length. Please start a new chat to continue.")],
            "current_agent": "booking_specialist",
        }

    ctx = _extract_context_from_messages(state["messages"], state.get("booking_context"))
    missing = _compute_missing_fields(ctx)

    llm = get_llm_with_tools()
    system = BOOKING_SPECIALIST_SYSTEM_PROMPT.format(
        today=date.today().isoformat(),
        day_of_week=date.today().strftime("%A"),
        missing_fields=", ".join(missing) if missing else "none — all collected",
        collected_fields=_format_collected(ctx),
    )

    try:
        response = await llm.ainvoke(
            [SystemMessage(content=system)] + list(state["messages"])
        )
    except RateLimitError:
        response = AIMessage(content="I'm temporarily unavailable due to API rate limits. Please try again in a few minutes.")

    booking_confirmed = ctx.get("slot_reserved", False) and ctx.get("notification_sent", False)

    return {
        "messages": [response],
        "current_agent": "booking_specialist",
        "booking_context": ctx,
        "missing_fields": missing,
        "booking_confirmed": booking_confirmed,
    }