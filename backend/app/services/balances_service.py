"""Balance and settle-up application services."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Group
from app.repositories import expenses as expense_repository
from app.repositories import payments as payment_repository
from app.services.balances import (
    BalanceReport,
    ExpenseEntry,
    PaymentEntry,
    calculate_balances,
)
from app.services.money import decimal_to_satang
from app.services.settlement import Transfer, settle_up


def build_balance_report(session: Session, group: Group) -> BalanceReport:
    expenses = [
        ExpenseEntry(
            paid_by=expense.paid_by,
            amount_satang=decimal_to_satang(expense.amount),
            shares=tuple(
                (share.username, decimal_to_satang(share.amount)) for share in expense.shares
            ),
        )
        for expense in expense_repository.list_active_for_balances(session, group.id)
    ]
    payments = [
        PaymentEntry(
            from_user=payment.from_user,
            to_user=payment.to_user,
            amount_satang=decimal_to_satang(payment.amount),
        )
        for payment in payment_repository.list_for_group(session, group.id)
    ]
    return calculate_balances(group.member_usernames, expenses, payments)


def build_settlement(session: Session, group: Group) -> list[Transfer]:
    return settle_up(build_balance_report(session, group))
