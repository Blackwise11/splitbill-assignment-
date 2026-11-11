"""Strict money parsing and formatting.

All monetary arithmetic is performed on integer satang (1 THB = 100 satang).
``float`` is never used: inputs are validated as decimal strings and converted
directly to integers.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from app.core.exceptions import DomainValidationError

SATANG_PER_BAHT = 100
MAX_AMOUNT_SATANG = 999_999_999_999  # NUMERIC(12,2) upper bound.
MAX_INTEGER_DIGITS = 10

_DIGITS_RE = re.compile(r"^\d+$")
_DECIMAL_RE = re.compile(r"^(?P<whole>\d+)(?:\.(?P<fraction>\d+))?$")


def parse_money(
    value: object,
    *,
    field: str = "Amount",
    allow_zero: bool = False,
) -> int:
    """Parse a decimal string into integer satang with strict validation."""
    if not isinstance(value, str):
        raise DomainValidationError(
            f'{field} must be a string such as "1000.00".',
            code="invalid_money_type",
        )

    if not value:
        raise DomainValidationError(f"{field} is required.", code="invalid_money")
    if value != value.strip():
        raise DomainValidationError(
            f"{field} must not contain surrounding whitespace.",
            code="invalid_money",
        )
    if value.startswith("-"):
        raise DomainValidationError(
            f"{field} cannot be negative.",
            code="invalid_money",
        )

    match = _DECIMAL_RE.match(value)
    if match is None:
        raise DomainValidationError(
            f'{field} must be a decimal number such as "1000.00".',
            code="invalid_money",
        )

    whole = match.group("whole")
    fraction = match.group("fraction") or ""
    if len(fraction) > 2:
        raise DomainValidationError(
            f"{field} has {len(fraction)} decimal places; "
            "amounts are limited to 2 decimal places (satang).",
            code="too_many_decimal_places",
        )
    if len(whole) > MAX_INTEGER_DIGITS:
        raise DomainValidationError(
            f"{field} exceeds the maximum supported value of 9,999,999,999.99 THB.",
            code="amount_too_large",
        )

    if not _DIGITS_RE.match(whole):
        raise DomainValidationError(
            f'{field} must be a decimal number such as "1000.00".',
            code="invalid_money",
        )

    satang = int(whole) * SATANG_PER_BAHT + int(fraction.ljust(2, "0") or "0")
    if satang > MAX_AMOUNT_SATANG:
        raise DomainValidationError(
            f"{field} exceeds the maximum supported value of 9,999,999,999.99 THB.",
            code="amount_too_large",
        )
    if satang == 0 and not allow_zero:
        raise DomainValidationError(
            f"{field} must be greater than 0.00 THB.",
            code="amount_not_positive",
        )
    return satang


def decimal_to_satang(value: Decimal, *, field: str = "Amount") -> int:
    """Convert a database Decimal to satang, rejecting sub-satang values."""
    if not isinstance(value, Decimal):
        try:
            value = Decimal(str(value))
        except (InvalidOperation, ValueError) as exc:
            raise DomainValidationError(
                f"{field} is not a valid decimal value.", code="invalid_money"
            ) from exc
    if not value.is_finite():
        raise DomainValidationError(f"{field} is not finite.", code="invalid_money")
    quantized = value.quantize(Decimal("0.01"))
    if quantized != value:
        raise DomainValidationError(
            f"{field} has more than 2 decimal places.", code="too_many_decimal_places"
        )
    return int(quantized * SATANG_PER_BAHT)


def satang_to_decimal(satang: int) -> Decimal:
    """Render satang as an exact two-decimal Decimal without float conversion."""
    return Decimal(satang).scaleb(-2)


def format_satang(satang: int) -> str:
    """Format satang as a machine-readable amount, e.g. ``1000.00``."""
    return f"{satang_to_decimal(satang):.2f}"


def format_thb(satang: int) -> str:
    """Format satang with thousands separators, e.g. ``1,000.00``."""
    sign = "-" if satang < 0 else ""
    absolute = abs(satang)
    whole, fraction = divmod(absolute, SATANG_PER_BAHT)
    return f"{sign}{whole:,}.{fraction:02d}"


def format_thb_amount(value: Decimal) -> str:
    """Format a Decimal baht amount with thousands separators."""
    return format_thb(decimal_to_satang(value))
