from datetime import date, time, datetime, timedelta
from typing import Optional
import dateparser
from dateutil.relativedelta import relativedelta, MO, TU, WE, TH, FR, SA, SU


_WEEKDAYS = {
    "monday": MO, "tuesday": TU, "wednesday": WE,
    "thursday": TH, "friday": FR, "saturday": SA, "sunday": SU,
}

_PREFIXES = ("this coming ", "next ", "this ", "coming ", "upcoming ")


def _parse_next_weekday(raw: str, ref: date) -> Optional[date]:
    lower = raw.strip().lower()
    for prefix in _PREFIXES:
        if lower.startswith(prefix):
            lower = lower[len(prefix):].strip()
            break
    if lower not in _WEEKDAYS:
        return None
    wd = _WEEKDAYS[lower]
    ref_dt = datetime(ref.year, ref.month, ref.day)
    result = ref_dt + relativedelta(weekday=wd(+1))
    if result.date() <= ref:
        result = ref_dt + timedelta(weeks=1) + relativedelta(weekday=wd(+1))
    return result.date()


def normalize_date(raw: str, reference: Optional[date] = None) -> str:
    """Parse any human date string → ISO 8601 'YYYY-MM-DD'. Raises ValueError on failure."""
    ref = reference or date.today()

    d = _parse_next_weekday(raw, ref)

    if d is None:
        dp_settings = {
            "PREFER_DATES_FROM": "future",
            "RELATIVE_BASE": datetime(ref.year, ref.month, ref.day),
            "RETURN_AS_TIMEZONE_AWARE": False,
        }
        parsed = dateparser.parse(raw.strip(), settings=dp_settings)
        if not parsed:
            raise ValueError(f"Cannot understand date: '{raw}'")
        d = parsed.date()

    if d < ref:
        raise ValueError(f"Date '{raw}' is in the past. Please choose a future date.")
    if d > ref + timedelta(days=90):
        raise ValueError("Date is more than 90 days away. Please choose a date within the next 90 days.")
    return d.isoformat()


def normalize_date_range(raw: str, reference: Optional[date] = None) -> tuple[str, str]:
    """Parse a range phrase → (start_iso, end_iso). Falls back to single date for both."""
    ref = reference or date.today()
    lower = raw.strip().lower()

    if "weekend" in lower:
        days_until_sat = (5 - ref.weekday()) % 7
        if days_until_sat == 0:
            days_until_sat = 7
        sat = ref + timedelta(days=days_until_sat)
        sun = sat + timedelta(days=1)
        return sat.isoformat(), sun.isoformat()

    if "next week" in lower:
        mon = ref - timedelta(days=ref.weekday()) + timedelta(weeks=1)
        sun = mon + timedelta(days=6)
        return mon.isoformat(), sun.isoformat()

    if "this week" in lower:
        mon = ref - timedelta(days=ref.weekday())
        sun = mon + timedelta(days=6)
        return max(ref, mon).isoformat(), sun.isoformat()

    if lower == "tomorrow":
        d = ref + timedelta(days=1)
        return d.isoformat(), d.isoformat()

    d = normalize_date(raw, ref)
    return d, d


def normalize_time(raw: str) -> str:
    """Parse any human time string → 'HH:MM' 24-hour. Raises ValueError on failure."""
    keywords = {
        "morning": "09:00",
        "noon": "12:00",
        "lunch": "12:00",
        "afternoon": "14:00",
        "evening": "17:00",
        "eod": "17:00",
        "end of day": "17:00",
    }
    normalized_raw = raw.strip().lower()
    if normalized_raw in keywords:
        return keywords[normalized_raw]

    parsed = dateparser.parse(f"today at {raw}", settings={"RETURN_AS_TIMEZONE_AWARE": False})
    if not parsed:
        raise ValueError(f"Cannot understand time: '{raw}'")

    t = parsed.time()
    if t.hour < 8 or t.hour >= 18:
        raise ValueError(f"Time {t.strftime('%I:%M %p')} is outside booking hours (8 AM – 6 PM).")

    minutes = t.hour * 60 + t.minute
    quantized = round(minutes / 30) * 30
    h, m = divmod(quantized, 60)
    if h >= 18:
        h, m = 17, 30
    return f"{h:02d}:{m:02d}"