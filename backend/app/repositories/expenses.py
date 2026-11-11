"""Data access for expenses and shares."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Expense


def get_expense(session: Session, group_id: int, expense_id: int) -> Expense | None:
    statement = (
        select(Expense)
        .where(Expense.id == expense_id, Expense.group_id == group_id)
        .options(selectinload(Expense.shares))
    )
    return session.scalar(statement)


def get_by_idempotency_key(session: Session, group_id: int, idempotency_key: str) -> Expense | None:
    statement = (
        select(Expense)
        .where(
            Expense.group_id == group_id,
            Expense.idempotency_key == idempotency_key,
        )
        .options(selectinload(Expense.shares))
    )
    return session.scalar(statement)


def list_active(session: Session, group_id: int) -> list[Expense]:
    statement = (
        select(Expense)
        .where(Expense.group_id == group_id, Expense.is_deleted.is_(False))
        .order_by(Expense.created_at.desc(), Expense.id.desc())
        .options(selectinload(Expense.shares))
    )
    return list(session.scalars(statement))


def list_active_for_balances(session: Session, group_id: int) -> list[Expense]:
    statement = (
        select(Expense)
        .where(Expense.group_id == group_id, Expense.is_deleted.is_(False))
        .order_by(Expense.id)
        .options(selectinload(Expense.shares))
    )
    return list(session.scalars(statement))
