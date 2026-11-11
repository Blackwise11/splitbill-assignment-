"""Repayment request/response schemas."""

from __future__ import annotations

from typing import Annotated

from pydantic import StringConstraints, model_validator

from app.schemas.groups import StrictModel, Username
from app.schemas.money import Money, MoneyOut, TimestampOut


class PaymentCreate(StrictModel):
    from_user: Username
    to_user: Username
    amount: Money
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None

    @model_validator(mode="after")
    def _users_are_distinct(self) -> PaymentCreate:
        if self.from_user == self.to_user:
            raise ValueError("A member cannot record a repayment to themselves.")
        return self


class PaymentOut(StrictModel):
    id: int
    group_id: int
    from_user: str
    to_user: str
    amount: MoneyOut
    note: str | None
    created_at: TimestampOut


class PaymentListOut(StrictModel):
    payments: list[PaymentOut]
    count: int
