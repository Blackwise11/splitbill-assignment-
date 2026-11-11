"""API response presenters.

Keeping ORM -> schema mapping out of routers makes endpoints thin and gives
tests a single place to assert on the public JSON shape.
"""

from __future__ import annotations

from app.models import Expense, Payment
from app.schemas.balances import (
    BalanceLineOut,
    BalancesOut,
    SettleUpOut,
    TransferOut,
)
from app.schemas.expenses import ExpenseListOut, ExpenseOut
from app.schemas.payments import PaymentListOut, PaymentOut
from app.services.balances import BalanceReport
from app.services.money import satang_to_decimal
from app.services.settlement import Transfer


def expense_to_out(expense: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=expense.id,
        group_id=expense.group_id,
        description=expense.description,
        amount=expense.amount,
        paid_by=expense.paid_by,
        split_type=expense.split_type,
        shares={
            share.username: share.amount
            for share in sorted(expense.shares, key=lambda item: item.username)
        },
        created_at=expense.created_at,
        is_deleted=expense.is_deleted,
        deleted_at=expense.deleted_at,
    )


def expense_list_to_out(expenses: list[Expense]) -> ExpenseListOut:
    items = [expense_to_out(expense) for expense in expenses]
    return ExpenseListOut(expenses=items, count=len(items))


def payment_to_out(payment: Payment) -> PaymentOut:
    return PaymentOut(
        id=payment.id,
        group_id=payment.group_id,
        from_user=payment.from_user,
        to_user=payment.to_user,
        amount=payment.amount,
        note=payment.note,
        created_at=payment.created_at,
    )


def payment_list_to_out(payments: list[Payment]) -> PaymentListOut:
    items = [payment_to_out(payment) for payment in payments]
    return PaymentListOut(payments=items, count=len(items))


def balances_to_out(group_id: int, report: BalanceReport) -> BalancesOut:
    return BalancesOut(
        group_id=group_id,
        members=[
            BalanceLineOut(
                username=line.username,
                paid=satang_to_decimal(line.paid_satang),
                owed=satang_to_decimal(line.owed_satang),
                balance=satang_to_decimal(line.balance_satang),
            )
            for line in report.lines
        ],
        total=satang_to_decimal(report.total_satang),
    )


def transfers_to_out(group_id: int, transfers: list[Transfer]) -> SettleUpOut:
    items = [
        TransferOut(
            from_user=transfer.from_user,
            to_user=transfer.to_user,
            amount=satang_to_decimal(transfer.amount_satang),
        )
        for transfer in transfers
    ]
    return SettleUpOut(
        group_id=group_id,
        transactions=items,
        transaction_count=len(items),
    )
