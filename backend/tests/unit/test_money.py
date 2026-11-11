"""Money parsing, formatting, and float-elimination tests."""

from decimal import Decimal

import pytest
from app.core.exceptions import DomainValidationError
from app.services.money import (
    decimal_to_satang,
    format_satang,
    format_thb,
    parse_money,
    satang_to_decimal,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("1000.00", 100_000),
        ("1000", 100_000),
        ("0.01", 1),
        ("33.34", 3334),
        ("9999999999.99", 999_999_999_999),
    ],
)
def test_parse_money_returns_exact_satang(value: str, expected: int) -> None:
    assert parse_money(value) == expected


def test_zero_point_one_plus_zero_point_two_is_exactly_thirty_satang() -> None:
    total = parse_money("0.1") + parse_money("0.2")
    assert total == 30
    assert format_satang(total) == "0.30"


@pytest.mark.parametrize("value", ["10.005", "1.001", "0.009"])
def test_more_than_two_decimals_is_rejected(value: str) -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        parse_money(value)
    assert exc_info.value.code == "too_many_decimal_places"
    assert "2 decimal places" in exc_info.value.message


@pytest.mark.parametrize("value", ["0", "0.00", "-1.00", "-0.01"])
def test_non_positive_amounts_are_rejected(value: str) -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        parse_money(value)
    assert exc_info.value.code in {"amount_not_positive", "invalid_money"}


@pytest.mark.parametrize("value", ["1e3", "1,000.00", " 10.00", "10.00 ", "abc", ".50", "10."])
def test_non_decimal_money_strings_are_rejected(value: str) -> None:
    with pytest.raises(DomainValidationError):
        parse_money(value)


def test_amount_above_numeric_12_2_capacity_is_rejected() -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        parse_money("10000000000.00")
    assert exc_info.value.code == "amount_too_large"


def test_allow_zero_for_individual_shares() -> None:
    assert parse_money("0.00", allow_zero=True) == 0


def test_decimal_conversion_is_exact() -> None:
    assert decimal_to_satang(Decimal("1000.00")) == 100_000
    assert decimal_to_satang(Decimal("0.30")) == 30
    with pytest.raises(DomainValidationError):
        decimal_to_satang(Decimal("0.005"))


def test_format_satang_and_thb() -> None:
    assert format_satang(100_000) == "1000.00"
    assert format_satang(30) == "0.30"
    assert format_thb(100_000) == "1,000.00"
    assert format_thb(-3_333) == "-33.33"
    assert satang_to_decimal(3334) == Decimal("33.34")
