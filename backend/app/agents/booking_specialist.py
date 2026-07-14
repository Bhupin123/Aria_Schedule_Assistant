import json
import re
from datetime import date
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_groq import ChatGroq
from app.agents.state import AgentState, BookingContext
from app.agents.prompts import BOOKING_SPECIALIST_SYSTEM_PROMPT
from app.core.config import settings
from app.tools.check_availability import check_availability
from app.tools.reserve_slot import reserve_slot
from app.tools.send_notification import send_booking_notification
from app.tools.cancel_booking import cancel_booking, list_bookings_by_email, list_bookings_by_date

TOOLS = [check_availability, reserve_slot, send_booking_notification, cancel_booking, list_bookings_by_email, list_bookings_by_date]

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


def _extract_email(text: str) -> str | None:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    return match.group(0) if match else None


def _extract_time_hint(text: str) -> str | None:
    patterns = [
        r"\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b",
        r"\b(\d{1,2}\s*(?:am|pm))\b",
        r"\b(morning|afternoon|evening|noon|midnight|lunch|eod)\b",
    ]
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_date_hint(text: str) -> str | None:
    patterns = [
        r"\b(today|tomorrow|yesterday)\b",
        r"\b((?:this coming|coming|this|next|upcoming)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b",
        r"\b((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b",
        r"\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b",
        r"\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)\b",
        r"\b(\d{4}-\d{2}-\d{2})\b",
    ]
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _compute_missing_fields(ctx: BookingContext | None, intent: str = "booking") -> list[str]:
    if intent == "cancel":
        # For cancel we don't need email — we can look up by date
        return []

    if ctx is None:
        return ["date", "time", "email"]
    missing = []
    if not ctx.get("normalized_date") and not ctx.get("raw_date"):
        missing.append("date")
    if not ctx.get("normalized_time") and not ctx.get("raw_time"):
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
    elif ctx.get("raw_date"):
        parts.append(f"date={ctx['raw_date']} (raw)")
    if ctx.get("normalized_time"):
        parts.append(f"time={ctx['normalized_time']}")
    elif ctx.get("raw_time"):
        parts.append(f"time={ctx['raw_time']} (raw)")
    if ctx.get("email"):
        parts.append(f"email={ctx['email']}")
    if ctx.get("purpose"):
        parts.append(f"purpose={ctx['purpose']}")
    if ctx.get("listed_bookings"):
        parts.append(f"found_bookings={len(ctx['listed_bookings'])}")
    if ctx.get("cancellation_confirmed"):
        parts.append(f"cancelled_booking_id={ctx.get('cancelled_booking_id')}")
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
        if isinstance(msg, HumanMessage):
            text = str(msg.content)

            if not ctx.get("email"):
                email = _extract_email(text)
                if email and "example.com" not in email:
                    ctx["email"] = email

            if not ctx.get("raw_date") and not ctx.get("normalized_date"):
                date_hint = _extract_date_hint(text)
                if date_hint:
                    ctx["raw_date"] = date_hint

            if not ctx.get("raw_time") and not ctx.get("normalized_time"):
                time_hint = _extract_time_hint(text)
                if time_hint:
                    ctx["raw_time"] = time_hint

        elif isinstance(msg, ToolMessage):
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

            elif "list_bookings_by_email" in tool_name and data.get("status") == "success":
                ctx["listed_bookings"] = data.get("bookings", [])

            elif "list_bookings_by_date" in tool_name and data.get("status") == "success":
                ctx["listed_bookings"] = data.get("bookings", [])

            elif "cancel_booking" in tool_name and data.get("status") == "success":
                ctx["cancellation_confirmed"] = True
                ctx["cancelled_booking_id"] = data.get("booking_id")

    return ctx


async def booking_specialist_node(state: AgentState) -> dict:
    print("\n" + "=" * 80)
    print("BOOKING SPECIALIST STARTED")
    print("=" * 80)
    print("Current state:")
    print(state)

    if state.get("turn_count", 0) > settings.MAX_TURNS:
        return {
            "messages": [AIMessage(content="I've reached the maximum conversation length. Please start a new chat to continue.")],
            "current_agent": "booking_specialist",
        }

    intent = state.get("intent", "booking")
    ctx = _extract_context_from_messages(state["messages"], state.get("booking_context"))
    missing = _compute_missing_fields(ctx, intent)

    print("Extracted context:")
    print(ctx)
    print("Missing fields:")
    print(missing)

    llm = get_llm_with_tools()
    system = BOOKING_SPECIALIST_SYSTEM_PROMPT.format(
        today=date.today().isoformat(),
        day_of_week=date.today().strftime("%A"),
        missing_fields=", ".join(missing) if missing else "none — all collected",
        collected_fields=_format_collected(ctx),
    )
    print("Calling Groq...")
    print(len(state["messages"]))
    print(state["messages"])

    print("=" * 80)
    print("MESSAGE COUNT:", len(state["messages"]))

    total_chars = sum(len(str(m.content)) for m in state["messages"])
    print("TOTAL CHARS:", total_chars)

    for i, m in enumerate(state["messages"]):
        print(f"{i}: {type(m).__name__} -> {len(str(m.content))} chars")

    def _trim_messages(messages: list, max_chars: int = 4000) -> list:
        trimmed = []
        total = 0
        for m in reversed(messages):
            c = len(str(m.content))
            if total + c > max_chars and trimmed:
                break
            trimmed.append(m)
            total += c
        return list(reversed(trimmed))

    trimmed = _trim_messages(state["messages"])
    response = await llm.ainvoke(
            [SystemMessage(content=system)] + trimmed
        )

    print("=" * 80)
    print("LLM RESPONSE")
    print("=" * 80)
    print("Type:", type(response))
    print("Content:")
    print(response.content)
    print()
    print("Tool Calls:")
    print(response.tool_calls)
    print("=" * 80)

    booking_confirmed = ctx.get("slot_reserved", False) and ctx.get("notification_sent", False)
    cancellation_confirmed = ctx.get("cancellation_confirmed", False)

    return {
        "messages": [response],
        "current_agent": "booking_specialist",
        "booking_context": ctx,
        "missing_fields": missing,
        "booking_confirmed": booking_confirmed or cancellation_confirmed,
    }