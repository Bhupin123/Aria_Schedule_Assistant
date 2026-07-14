from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.base import BaseCheckpointSaver
from langchain_core.messages import AIMessage
from app.agents.state import AgentState
from app.agents.triage_agent import triage_node
from app.agents.booking_specialist import booking_specialist_node, TOOLS


def route_from_triage(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent in ("booking", "cancel", "reschedule", "check"):
        return "booking_specialist"
    return END


def route_from_booking(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages:
        return END
    last = messages[-1]
    if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
        return "tools"
    return END




def create_graph(checkpointer: BaseCheckpointSaver) -> StateGraph:
    builder = StateGraph(AgentState)

    builder.add_node("triage", triage_node)
    builder.add_node("booking_specialist", booking_specialist_node)

    tool_node = ToolNode(TOOLS)

    async def debug_tools(state):
        print("\n" + "=" * 80)
        print("TOOL NODE EXECUTED")
        print("=" * 80)

        result = await tool_node.ainvoke(state)

        print("TOOL RESULT:")
        print(result)

        return result

    builder.add_node("tools", debug_tools)

    builder.add_edge(START, "triage")
    builder.add_conditional_edges("triage", route_from_triage, {
        "booking_specialist": "booking_specialist",
        END: END,
    })
    builder.add_conditional_edges("booking_specialist", route_from_booking, {
        "tools": "tools",
        END: END,
    })
    builder.add_edge("tools", "booking_specialist")

    return builder.compile(checkpointer=checkpointer)
