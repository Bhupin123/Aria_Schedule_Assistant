import uuid
from datetime import datetime
from sqlalchemy import DateTime, String, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    thread_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    last_intent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_active_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
