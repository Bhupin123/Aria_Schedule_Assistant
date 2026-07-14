import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_chat_service
from app.services.chat_service import ChatService
from app.models.schemas.chat import ChatRequest, ChatResponse, ThreadCreate, HistoryResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/threads", response_model=ThreadCreate, status_code=201)
async def create_thread():
    return ThreadCreate(thread_id=str(uuid.uuid4()))


@router.post("/messages", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    svc: ChatService = Depends(get_chat_service),
):
    return await svc.process_message(body.thread_id, body.message)


@router.get("/threads/{thread_id}/history", response_model=HistoryResponse)
async def get_history(
    thread_id: str,
    svc: ChatService = Depends(get_chat_service),
):
    return await svc.get_history(thread_id)


@router.delete("/threads/{thread_id}", status_code=204)
async def delete_thread(thread_id: str):
    # LangGraph checkpoints are not deleted (preserves audit trail).
    # In production, add explicit checkpoint deletion here.
    return None
