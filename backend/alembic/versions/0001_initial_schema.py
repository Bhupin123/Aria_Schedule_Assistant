"""initial schema

Revision ID: 0001
Revises:
Create Date: 2025-01-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "availability_slots",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slot_date", sa.Date(), nullable=False),
        sa.Column("slot_time", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slot_date", "slot_time", name="uq_slot_date_time"),
    )
    op.create_index("ix_availability_slots_slot_date", "availability_slots", ["slot_date"])
    op.create_index("ix_availability_slots_is_available", "availability_slots", ["is_available"])

    op.create_table(
        "bookings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("availability_slot_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("booking_time", sa.Time(), nullable=False),
        sa.Column("purpose", sa.String(500), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="confirmed"),
        sa.Column("cancelled_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.ForeignKeyConstraint(["availability_slot_id"], ["availability_slots.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bookings_email", "bookings", ["email"])
    op.create_index("ix_bookings_booking_date", "bookings", ["booking_date"])
    op.create_index("ix_bookings_availability_slot_id", "bookings", ["availability_slot_id"])

    op.create_table(
        "conversations",
        sa.Column("thread_id", sa.String(36), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("last_intent", sa.String(50), nullable=True),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.Column("last_active_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.PrimaryKeyConstraint("thread_id"),
    )
    op.create_index("ix_conversations_user_email", "conversations", ["user_email"])

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("booking_id", sa.String(), nullable=False),
        sa.Column("recipient_email", sa.String(255), nullable=False),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_logs_booking_id", "notification_logs", ["booking_id"])


def downgrade() -> None:
    op.drop_table("notification_logs")
    op.drop_table("conversations")
    op.drop_table("bookings")
    op.drop_table("availability_slots")
