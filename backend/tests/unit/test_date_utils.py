import pytest
from datetime import date
from app.core.date_utils import normalize_date, normalize_time


REF = date(2025, 1, 15)  # Wednesday


class TestNormalizeDate:
    def test_tomorrow(self):
        assert normalize_date("tomorrow", REF) == "2025-01-16"

    def test_next_monday(self):
        assert normalize_date("next Monday", REF) == "2025-01-20"

    def test_monday_bare(self):
        assert normalize_date("Monday", REF) == "2025-01-20"

    def test_next_friday(self):
        assert normalize_date("next Friday", REF) == "2025-01-17"

    def test_friday_bare(self):
        assert normalize_date("Friday", REF) == "2025-01-17"

    def test_iso_date(self):
        assert normalize_date("2025-01-20", REF) == "2025-01-20"

    def test_month_day(self):
        assert normalize_date("Jan 20", REF) == "2025-01-20"

    def test_in_n_days(self):
        assert normalize_date("in 2 days", REF) == "2025-01-17"

    def test_next_week(self):
        result = normalize_date("next week", REF)
        d = date.fromisoformat(result)
        assert d > REF

    def test_past_date_raises(self):
        with pytest.raises(ValueError, match="past"):
            normalize_date("yesterday", REF)

    def test_today_is_allowed(self):
        """Today is not "in the past" — time-level validation happens at reserve_slot."""
        result = normalize_date("2025-01-15", REF)
        assert result == "2025-01-15"

    def test_too_far_future_raises(self):
        with pytest.raises(ValueError, match="90 days"):
            normalize_date("2025-06-01", REF)

    def test_garbage_raises(self):
        with pytest.raises(ValueError, match="Cannot understand"):
            normalize_date("asap please", REF)


class TestNormalizeTime:
    def test_2pm(self):
        assert normalize_time("2pm") == "14:00"

    def test_24h(self):
        assert normalize_time("14:00") == "14:00"

    def test_afternoon(self):
        assert normalize_time("afternoon") == "14:00"

    def test_morning(self):
        assert normalize_time("morning") == "09:00"

    def test_noon(self):
        assert normalize_time("noon") == "12:00"

    def test_930am(self):
        assert normalize_time("9:30am") == "09:30"

    def test_quantize_down(self):
        # 3:07pm → 15:00 (rounds to nearest 30)
        assert normalize_time("3:07pm") == "15:00"

    def test_quantize_up(self):
        # 3:20pm → 15:30 (rounds to nearest 30)
        assert normalize_time("3:20pm") == "15:30"

    def test_outside_hours_raises(self):
        with pytest.raises(ValueError, match="outside booking hours"):
            normalize_time("7am")

    def test_outside_hours_late_raises(self):
        with pytest.raises(ValueError, match="outside booking hours"):
            normalize_time("7pm")
