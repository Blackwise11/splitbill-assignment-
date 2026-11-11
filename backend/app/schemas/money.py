"""Reusable Pydantic money and timestamp types."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, Field, PlainSerializer

from app.core.exceptions import DomainValidationError
from app.services.money import (
    decimal_to_satang,
    format_satang,
    parse_money,
)


def _validate_money(value: str, *, allow_zero: bool) -> str:
    try:
        satang = parse_money(value, allow_zero=allow_zero)
    except DomainValidationError as exc:
        # Pydantic validators must raise ValueError to produce a 422 response.
        raise ValueError(exc.message) from exc
    return format_satang(satang)


def _positive_money(value: str) -> str:
    return _validate_money(value, allow_zero=False)


def _non_negative_money(value: str) -> str:
    return _validate_money(value, allow_zero=True)


def _serialize_money(value: Decimal) -> str:
    return format_satang(decimal_to_satang(value))


def _serialize_timestamp(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


# Input: a strict JSON string such as "1000.00" (numbers are rejected).
Money = Annotated[str, Field(strict=True), AfterValidator(_positive_money)]
ShareMoney = Annotated[str, Field(strict=True), AfterValidator(_non_negative_money)]

# Output: Decimal from the ORM serialized as a two-decimal string.
MoneyOut = Annotated[Decimal, PlainSerializer(_serialize_money, return_type=str)]
TimestampOut = Annotated[datetime, PlainSerializer(_serialize_timestamp, return_type=str)]
