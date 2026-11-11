"""Pure zero-sum balance calculation."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from app.core.exceptions import DomainValidationError, InvariantError


@dataclass(frozen=True, slots=True)
class ExpenseEntry:
    """A payment plus its per-member obligations, in satang."""

    paid_by: str
    amount_satang: int
    shares: tuple[tuple[str, int], ...]


@dataclass(frozen=True, slots=True)
class PaymentEntry:
    """A direct repayment between two members, in satang."""

    from_user: str
    to_user: str
    amount_satang: int


@dataclass(frozen=True, slots=True)
class BalanceLine:
    username: str
    paid_satang: int
    owed_satang: int

    @property
    def balance_satang(self) -> int:
        return self.paid_satang - self.owed_satang


@dataclass(frozen=True, slots=True)
class BalanceReport:
    lines: tuple[BalanceLine, ...]

    @property
    def total_satang(self) -> int:
        return sum(line.balance_satang for line in self.lines)

    def by_username(self, username: str) -> BalanceLine:
        for line in self.lines:
            if line.username == username:
                return line
        raise KeyError(username)


def calculate_balances(
    members: Sequence[str],
    expenses: Iterable[ExpenseEntry],
    payments: Iterable[PaymentEntry] = (),
) -> BalanceReport:
    """Compute paid, owed, and net balances, asserting the zero-sum invariant."""
    if not members:
        raise DomainValidationError("The group has no members.", code="empty_group")
    if len(set(members)) != len(members):
        raise InvariantError("The group contains duplicate members.")

    paid = dict.fromkeys(members, 0)
    owed = dict.fromkeys(members, 0)

    for expense in expenses:
        if expense.paid_by not in paid:
            raise InvariantError(f"Expense payer {expense.paid_by!r} is not a group member.")
        if expense.amount_satang < 0:
            raise InvariantError("Expense amount cannot be negative.")
        share_total = 0
        for username, amount in expense.shares:
            if username not in owed:
                raise InvariantError(f"Share owner {username!r} is not a group member.")
            if amount < 0:
                raise InvariantError("Expense share cannot be negative.")
            share_total += amount
            owed[username] += amount
        if share_total != expense.amount_satang:
            raise InvariantError(
                "Expense shares do not equal the expense amount "
                f"({share_total} != {expense.amount_satang} satang)."
            )
        paid[expense.paid_by] += expense.amount_satang

    for payment in payments:
        if payment.from_user not in paid or payment.to_user not in paid:
            raise InvariantError("Payment references a non-member.")
        if payment.from_user == payment.to_user:
            raise InvariantError("A member cannot repay themselves.")
        if payment.amount_satang < 0:
            raise InvariantError("Payment amount cannot be negative.")
        paid[payment.from_user] += payment.amount_satang
        owed[payment.to_user] += payment.amount_satang

    report = BalanceReport(
        lines=tuple(
            BalanceLine(username=username, paid_satang=paid[username], owed_satang=owed[username])
            for username in sorted(members)
        )
    )
    if report.total_satang != 0:
        raise InvariantError(f"Balances do not sum to zero: {report.total_satang} satang.")
    return report
