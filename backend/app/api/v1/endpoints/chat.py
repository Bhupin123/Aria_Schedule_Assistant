import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.dependencies import get_chat_service
from app.services.chat_service import ChatService
from app.models.schemas.chat import ChatRequest, ChatResponse, ThreadCreate, HistoryResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/threads", response_model=ThreadCreate, status_code=201)
async def create_thread():
    return ThreadCreate(thread_id=str(uuid.uuid4()))


@router.post("/messages", response_model=ChatResponse)
async def send_message(
    request: Request,
    body: ChatRequest,
    svc: ChatService = Depends(get_chat_service),
):
    try:
        return await svc.process_message(body.thread_id, body.message)
    except Exception as e:
        logger.error("Chat processing error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process message. Please try again.")


@router.get("/threads/{thread_id}/history", response_model=HistoryResponse)
async def get_history(
    thread_id: str,
    svc: ChatService = Depends(get_chat_service),
):
    try:
        return await svc.get_history(thread_id)
    except Exception as e:
        logger.error("History fetch error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch history.")


@router.delete("/threads/{thread_id}", status_code=204)
async def delete_thread(thread_id: str):
    return None