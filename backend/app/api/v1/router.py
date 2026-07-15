from fastapi import APIRouter
from app.api.v1.endpoints import chat, bookings, availability, health

router = APIRouter(prefix="/api/v1")
router.include_router(chat.router)
router.include_router(bookings.router)
router.include_router(availability.router)

health_router = APIRouter()
health_router.include_router(health.router)
