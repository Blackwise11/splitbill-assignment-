"""Zero-sum balance and settlement unit tests."""

import pytest
from app.core.exceptions import InvariantError
from app.services.balances import ExpenseEntry, PaymentEntry, calculate_balances
from app.services.settlement import settle_up


def test_balances_are_zero_sum_and_positive_means_owed() -> None:
    report = calculate_balances(
        ["alice", "bob", "carol"],
        [
            ExpenseEntry(
                paid_by="alice",
                amount_satang=10_000,
                shares=(("alice", 3334), ("bob", 3333), ("carol", 3333)),
            )
        ],
    )

    assert report.total_satang == 0
    assert report.by_username("alice").balance_satang == 6666
    assert report.by_username("bob").balance_satang == -3333
    assert report.by_username("carol").balance_satang == -3333


def test_payments_move_balances_without_breaking_zero_sum() -> None:
    report = calculate_balances(
        ["alice", "bob"],
        [ExpenseEntry(paid_by="alice", amount_satang=10_000, shares=(("bob", 10_000),))],
        [PaymentEntry(from_user="bob", to_user="alice", amount_satang=4_000)],
    )

    assert report.by_username("alice").balance_satang == 6_000
    assert report.by_username("bob").balance_satang == -6_000
    assert report.total_satang == 0


def test_mismatched_expense_shares_raise_invariant_error() -> None:
    with pytest.raises(InvariantError):
        calculate_balances(
            ["alice", "bob"],
            [ExpenseEntry(paid_by="alice", amount_satang=100, shares=(("bob", 90),))],
        )


def test_settle_up_clears_all_balances() -> None:
    report = calculate_balances(
        ["alice", "bob", "carol"],
        [
            ExpenseEntry(
                paid_by="alice",
                amount_satang=10_000,
                shares=(("alice", 3334), ("bob", 3333), ("carol", 3333)),
            )
        ],
    )

    transfers = settle_up(report)

    assert len(transfers) == 2
    assert [(t.from_user, t.to_user, t.amount_satang) for t in transfers] == [
        ("bob", "alice", 3333),
        ("carol", "alice", 3333),
    ]


def test_settle_up_is_empty_when_everyone_is_even() -> None:
    report = calculate_balances(["alice", "bob"], [])
    assert settle_up(report) == []
