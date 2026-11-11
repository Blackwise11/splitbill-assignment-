"""Repayment endpoints (optional extension)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, Response, status

from app.api.deps import DbSession, GroupAccess
from app.schemas.payments import PaymentCreate, PaymentListOut, PaymentOut
from app.services.idempotency import resolve_idempotency_key
from app.services.payments import create_payment, list_payments
from app.services.serializers import payment_list_to_out, payment_to_out

router = APIRouter(tags=["payments"])

IdempotencyKey = Annotated[
    str | None,
    Header(
        alias="Idempotency-Key",
        description="Repeat-safe key. Replaying the same key returns the original payment.",
    ),
]


@router.post(
    "/groups/{group_id}/payments",
    response_model=PaymentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record a repayment between two members",
)
def post_payment(
    group: GroupAccess,
    payload: PaymentCreate,
    session: DbSession,
    response: Response,
    idempotency_key: IdempotencyKey = None,
) -> PaymentOut:
    key = resolve_idempotency_key(idempotency_key)
    result = create_payment(
        session,
        group=group,
        idempotency_key=key,
        payload=payload,
    )
    if result.replayed:
        response.status_code = status.HTTP_200_OK
        response.headers["Idempotent-Replayed"] = "true"
    return payment_to_out(result.payment)


@router.get(
    "/groups/{group_id}/payments",
    response_model=PaymentListOut,
    summary="List recorded repayments",
)
def get_payments(group: GroupAccess, session: DbSession) -> PaymentListOut:
    return payment_list_to_out(list_payments(session, group.id))
