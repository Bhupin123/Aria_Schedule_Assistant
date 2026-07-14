import asyncio
import smtplib
import uuid
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.orm.notification_log import NotificationLog


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def send_booking_confirmation(self, booking_id: str, email: str, details: dict) -> bool:
        subject = f"Booking Confirmed – {details.get('date', '')} at {details.get('time', '')}"
        body_html = self._render_confirmation(details)
        return await self._send(booking_id, email, subject, body_html, "booking_confirmed")

    def _render_confirmation(self, details: dict) -> str:
        return f"""
        <html><body style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#4f46e5;">Booking Confirmed ✓</h2>
        <p>Your appointment has been scheduled.</p>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px;font-weight:bold;">Date</td>
              <td style="padding:8px;">{details.get('date', 'N/A')}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Time</td>
              <td style="padding:8px;">{details.get('time', 'N/A')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Booking ID</td>
              <td style="padding:8px;">{details.get('booking_id', 'N/A')}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">
          To cancel, visit our website or reply to this email.
        </p>
        </body></html>
        """

    async def _send(
        self,
        booking_id: str,
        to_email: str,
        subject: str,
        body_html: str,
        notification_type: str,
    ) -> bool:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            await self._log(booking_id, to_email, notification_type, "skipped", "SMTP not configured")
            return True  # non-fatal in dev

        for attempt in range(1, 4):
            try:
                await asyncio.to_thread(self._smtp_send, to_email, subject, body_html)
                await self._log(booking_id, to_email, notification_type, "sent", attempt=attempt)
                return True
            except Exception as exc:
                if attempt == 3:
                    await self._log(booking_id, to_email, notification_type, "failed", str(exc), attempt)
                    return False
                await asyncio.sleep(2 ** (attempt - 1))
        return False

    def _smtp_send(self, to_email: str, subject: str, body_html: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

    async def _log(
        self,
        booking_id: str,
        email: str,
        notification_type: str,
        status: str,
        error_message: Optional[str] = None,
        attempt: int = 1,
    ) -> None:
        log = NotificationLog(
            id=str(uuid.uuid4()),
            booking_id=booking_id,
            recipient_email=email,
            notification_type=notification_type,
            status=status,
            error_message=error_message,
            attempt_number=attempt,
            sent_at=datetime.utcnow() if status == "sent" else None,
        )
        self.session.add(log)
        await self.session.flush()
