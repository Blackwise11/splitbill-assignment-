"""Repayment recording service (optional extension)."""

from __future__ import annotations

import time
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.exceptions import DomainValidationError
from app.models import Group, Payment
from app.repositories import payments as payment_repository
from app.schemas.payments import PaymentCreate
from app.services.money import parse_money, satang_to_decimal

MAX_SQLITE_RETRIES = 5


@dataclass(frozen=True, slots=True)
class CreatePaymentResult:
    payment: Payment
    replayed: bool


def _validate_members(group: Group, payload: PaymentCreate) -> None:
    members = set(group.member_usernames)
    unknown = sorted({payload.from_user, payload.to_user} - members)
    if unknown:
        raise DomainValidationError(
            "Both members of a repayment must belong to this group.",
            code="payment_member_not_in_group",
            details={"members": unknown},
        )


def create_payment(
    session: Session,
    *,
    group: Group,
    idempotency_key: str,
    payload: PaymentCreate,
) -> CreatePaymentResult:
    existing = payment_repository.get_by_idempotency_key(session, group.id, idempotency_key)
    if existing is not None:
        return CreatePaymentResult(payment=existing, replayed=True)

    _validate_members(group, payload)
    amount_satang = parse_money(payload.amount)

    for attempt in range(MAX_SQLITE_RETRIES):
        payment = Payment(
            group_id=group.id,
            from_user=payload.from_user,
            to_user=payload.to_user,
            amount=satang_to_decimal(amount_satang),
            note=payload.note or None,
            idempotency_key=idempotency_key,
        )
        try:
            session.add(payment)
            session.commit()
            session.refresh(payment)
            return CreatePaymentResult(payment=payment, replayed=False)
        except IntegrityError:
            session.rollback()
            existing = payment_repository.get_by_idempotency_key(session, group.id, idempotency_key)
            if existing is not None:
                return CreatePaymentResult(payment=existing, replayed=True)
            raise
        except OperationalError as exc:
            session.rollback()
            if "database is locked" not in str(exc).lower() or attempt == MAX_SQLITE_RETRIES - 1:
                raise
            existing = payment_repository.get_by_idempotency_key(session, group.id, idempotency_key)
            if existing is not None:
                return CreatePaymentResult(payment=existing, replayed=True)
            time.sleep(0.05 * (attempt + 1))

    raise AssertionError("unreachable")


def list_payments(session: Session, group_id: int) -> list[Payment]:
    return payment_repository.list_for_group(session, group_id)
