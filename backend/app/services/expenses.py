"""Expense creation, listing, and soft-delete business rules."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy.orm import Session

from app.core.exceptions import DomainValidationError, ForbiddenError, NotFoundError
from app.models import Expense, ExpenseShare, Group
from app.repositories import expenses as expense_repository
from app.schemas.expenses import EqualSplit, ExactSplit, ExpenseCreate
from app.services.allocation import ShareLine, allocate_equal, allocate_exact
from app.services.money import parse_money, satang_to_decimal


@dataclass(frozen=True, slots=True)
class CreateExpenseResult:
    expense: Expense
    replayed: bool


def _validate_payer(group: Group, paid_by: str) -> None:
    if paid_by not in set(group.member_usernames):
        raise DomainValidationError(
            f"The payer {paid_by!r} is not a member of this group.",
            code="payer_not_in_group",
            details={"paid_by": paid_by},
        )


def _validate_split_members(group: Group, usernames: list[str]) -> None:
    members = set(group.member_usernames)
    unknown = sorted({username for username in usernames if username not in members})
    if unknown:
        raise DomainValidationError(
            "Every participant in the split must be a member of this group.",
            code="split_member_not_in_group",
            details={"members": unknown},
        )


def _allocate(
    group: Group, payload: ExpenseCreate, total_satang: int
) -> tuple[Literal["equal", "exact"], list[ShareLine]]:
    _validate_payer(group, payload.paid_by)

    if isinstance(payload.split, EqualSplit):
        _validate_split_members(group, payload.split.members)
        return "equal", allocate_equal(total_satang, payload.split.members)

    if isinstance(payload.split, ExactSplit):
        usernames = list(payload.split.shares)
        _validate_split_members(group, usernames)
        parsed = {
            username: parse_money(
                raw,
                field=f"Share for {username}",
                allow_zero=True,
            )
            for username, raw in payload.split.shares.items()
        }
        return "exact", allocate_exact(total_satang, parsed)

    raise DomainValidationError("Unsupported split type.", code="unsupported_split")


def _new_expense(
    *,
    group: Group,
    payload: ExpenseCreate,
    idempotency_key: str,
    total_satang: int,
    split_type: Literal["equal", "exact"],
    allocation: list[ShareLine],
) -> Expense:
    expense = Expense(
        group_id=group.id,
        description=payload.description,
        amount=satang_to_decimal(total_satang),
        paid_by=payload.paid_by,
        split_type=split_type,
        idempotency_key=idempotency_key,
        is_deleted=False,
    )
    expense.shares = [
        ExpenseShare(
            username=line.username,
            amount=satang_to_decimal(line.amount_satang),
        )
        for line in allocation
    ]
    return expense


def create_expense(
    session: Session,
    *,
    group: Group,
    idempotency_key: str,
    payload: ExpenseCreate,
) -> CreateExpenseResult:
    """Create an expense once per ``(group_id, Idempotency-Key)``."""
    existing = expense_repository.get_by_idempotency_key(session, group.id, idempotency_key)
    if existing is not None:
        return CreateExpenseResult(expense=existing, replayed=True)

    total_satang = parse_money(payload.amount)
    split_type, allocation = _allocate(group, payload, total_satang)

    expense = _new_expense(
        group=group,
        payload=payload,
        idempotency_key=idempotency_key,
        total_satang=total_satang,
        split_type=split_type,
        allocation=allocation,
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return CreateExpenseResult(expense=expense, replayed=False)


def list_active_expenses(session: Session, group_id: int) -> list[Expense]:
    return expense_repository.list_active(session, group_id)


def get_expense_or_404(session: Session, group_id: int, expense_id: int) -> Expense:
    expense = expense_repository.get_expense(session, group_id, expense_id)
    if expense is None:
        raise NotFoundError("Expense not found.", code="expense_not_found")
    return expense


def soft_delete_expense(
    session: Session,
    *,
    group_id: int,
    expense_id: int,
    actor: str,
) -> Expense:
    """Soft-delete an expense; only its original payer may do so."""
    expense = get_expense_or_404(session, group_id, expense_id)
    if expense.paid_by != actor:
        raise ForbiddenError(
            "Only the member who paid this expense can delete it.",
            code="not_expense_payer",
        )
    if not expense.is_deleted:
        expense.is_deleted = True
        expense.deleted_at = datetime.now(UTC)
        session.commit()
        session.refresh(expense)
    return expense
