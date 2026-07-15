import json
from datetime import date
from langchain_core.messages import AIMessage, SystemMessage
from langchain_groq import ChatGroq
from app.agents.state import AgentState
from app.agents.prompts import TRIAGE_SYSTEM_PROMPT
from app.core.config import settings

_llm = None

# Intents that must be handled by a specialist — triage must NOT reply for these
SPECIALIST_INTENTS = {"booking", "cancel", "reschedule"}


def get_llm() -> ChatGroq:
    global _llm
    if _llm is None:
        _llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0,
        )
    return _llm


async def triage_node(state: AgentState) -> dict:
    llm = get_llm()
    system = TRIAGE_SYSTEM_PROMPT.format(today=date.today().isoformat())

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


async def triage_node(state: AgentState) -> dict:
    llm = get_llm()
    system = TRIAGE_SYSTEM_PROMPT.format(today=date.today().isoformat())

    trimmed = _trim_messages(state["messages"])
    response = await llm.ainvoke(
        [SystemMessage(content=system)] + trimmed
    )
    
    intent = "general"
    reply = None

    try:
        text = response.content
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        confidence = float(data.get("confidence", 0))
        intent = data.get("intent", "general") if confidence >= 0.6 else "general"
        reply = data.get("reply")
    except Exception:
        intent = "general"
        reply = "How can I help you today?"

    updates: dict = {
        "intent": intent,
        "current_agent": "triage",
        "turn_count": state.get("turn_count", 0) + 1,
    }

    # Never inject a reply for specialist intents — let the specialist do it
    if reply and intent not in SPECIALIST_INTENTS:
        updates["messages"] = [AIMessage(content=reply)]

    return updates