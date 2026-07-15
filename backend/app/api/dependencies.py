from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db_session
from app.services.chat_service import ChatService
from app.services.booking_service import BookingService
from app.services.availability_service import AvailabilityService
from app.services.notification_service import NotificationService


def get_graph(request: Request):
    return request.app.state.graph


async def get_chat_service(
    graph=Depends(get_graph),
    session: AsyncSession = Depends(get_db_session),
) -> ChatService:
    return ChatService(graph, session)


async def get_booking_service(
    session: AsyncSession = Depends(get_db_session),
) -> BookingService:
    return BookingService(session)


async def get_availability_service(
    session: AsyncSession = Depends(get_db_session),
) -> AvailabilityService:
    return AvailabilityService(session)


async def get_notification_service(
    session: AsyncSession = Depends(get_db_session),
) -> NotificationService:
    return NotificationService(session)
