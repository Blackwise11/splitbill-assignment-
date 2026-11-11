"""Exact satang allocation tests."""

import pytest
from app.core.exceptions import DomainValidationError
from app.services.allocation import allocate_equal, allocate_exact


def test_equal_split_100_baht_three_ways_allocates_every_satang() -> None:
    lines = allocate_equal(10_000, ["alice", "bob", "carol"])

    assert [(line.username, line.amount_satang) for line in lines] == [
        ("alice", 3334),
        ("bob", 3333),
        ("carol", 3333),
    ]
    assert sum(line.amount_satang for line in lines) == 10_000


def test_remainder_follows_supplied_member_order() -> None:
    lines = allocate_equal(10_000, ["carol", "bob", "alice"])

    assert [(line.username, line.amount_satang) for line in lines] == [
        ("carol", 3334),
        ("bob", 3333),
        ("alice", 3333),
    ]


def test_equal_split_of_single_satang_can_produce_zero_shares() -> None:
    lines = allocate_equal(1, ["alice", "bob", "carol"])

    assert [line.amount_satang for line in lines] == [1, 0, 0]
    assert sum(line.amount_satang for line in lines) == 1


def test_exact_split_must_sum_to_total() -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        allocate_exact(10_000, {"alice": 5000, "bob": 3000, "carol": 1000})

    assert exc_info.value.code == "shares_do_not_match_total"
    assert "The shares do not add up to the total" in exc_info.value.message
    assert exc_info.value.details["difference"] == "10.00"


def test_exact_split_accepts_matching_total() -> None:
    lines = allocate_exact(10_000, {"alice": 5000, "bob": 3000, "carol": 2000})

    assert [(line.username, line.amount_satang) for line in lines] == [
        ("alice", 5000),
        ("bob", 3000),
        ("carol", 2000),
    ]


def test_duplicate_member_is_rejected() -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        allocate_equal(100, ["alice", "alice"])
    assert exc_info.value.code == "duplicate_member"


def test_empty_split_is_rejected() -> None:
    with pytest.raises(DomainValidationError) as exc_info:
        allocate_equal(100, [])
    assert exc_info.value.code == "empty_split"
