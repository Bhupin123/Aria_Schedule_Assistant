import json
from datetime import date
from langchain_core.messages import AIMessage, SystemMessage
from langchain_groq import ChatGroq
from app.agents.state import AgentState
from app.agents.prompts import TRIAGE_SYSTEM_PROMPT
from app.core.config import settings

_llm = None


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

    response = await llm.ainvoke(
        [SystemMessage(content=system)] + list(state["messages"])
    )

    intent = "general"
    reply = None

    try:
        text = response.content
        # Strip markdown code fences if present
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        confidence = float(data.get("confidence", 0))
        if confidence >= 0.6:
            intent = data.get("intent", "general")
        else:
            intent = "general"
        reply = data.get("reply")
    except Exception:
        intent = "general"
        reply = "How can I help you today?"

    updates: dict = {
        "intent": intent,
        "current_agent": "triage",
        "turn_count": state.get("turn_count", 0) + 1,
    }

    if reply:
        updates["messages"] = [AIMessage(content=reply)]

    return updates
