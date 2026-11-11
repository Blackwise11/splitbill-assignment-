"""Data access for repayments."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Payment


def get_by_idempotency_key(session: Session, group_id: int, idempotency_key: str) -> Payment | None:
    statement = select(Payment).where(
        Payment.group_id == group_id,
        Payment.idempotency_key == idempotency_key,
    )
    return session.scalar(statement)


def list_for_group(session: Session, group_id: int) -> list[Payment]:
    statement = (
        select(Payment)
        .where(Payment.group_id == group_id)
        .order_by(Payment.created_at.desc(), Payment.id.desc())
    )
    return list(session.scalars(statement))
