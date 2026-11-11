"""Expense endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, Response, status

from app.api.deps import CurrentUser, DbSession, GroupAccess
from app.schemas.expenses import ExpenseCreate, ExpenseListOut, ExpenseOut
from app.services.expenses import (
    create_expense,
    list_active_expenses,
    soft_delete_expense,
)
from app.services.idempotency import resolve_idempotency_key
from app.services.serializers import expense_list_to_out, expense_to_out

router = APIRouter(tags=["expenses"])

IdempotencyKey = Annotated[
    str | None,
    Header(
        alias="Idempotency-Key",
        description="Repeat-safe key. Replaying the same key returns the original expense.",
    ),
]


@router.post(
    "/groups/{group_id}/expenses",
    response_model=ExpenseOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record an immutable expense",
)
def post_expense(
    group: GroupAccess,
    payload: ExpenseCreate,
    session: DbSession,
    response: Response,
    idempotency_key: IdempotencyKey = None,
) -> ExpenseOut:
    key = resolve_idempotency_key(idempotency_key)
    result = create_expense(
        session,
        group=group,
        idempotency_key=key,
        payload=payload,
    )
    if result.replayed:
        response.status_code = status.HTTP_200_OK
        response.headers["Idempotent-Replayed"] = "true"
    return expense_to_out(result.expense)


@router.get(
    "/groups/{group_id}/expenses",
    response_model=ExpenseListOut,
    summary="List active expenses, newest first",
)
def get_expenses(group: GroupAccess, session: DbSession) -> ExpenseListOut:
    return expense_list_to_out(list_active_expenses(session, group.id))


@router.delete(
    "/groups/{group_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete an expense (payer only)",
)
def delete_expense(
    expense_id: int,
    group: GroupAccess,
    session: DbSession,
    username: CurrentUser,
) -> Response:
    soft_delete_expense(
        session,
        group_id=group.id,
        expense_id=expense_id,
        actor=username,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
