"""Expense request/response schemas with a discriminated split union."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.schemas.groups import StrictModel, Username
from app.schemas.money import Money, MoneyOut, ShareMoney, TimestampOut

Description = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]


class EqualSplit(StrictModel):
    type: Literal["equal"]
    members: list[Username] = Field(min_length=1, max_length=100)

    @field_validator("members")
    @classmethod
    def _members_are_unique(cls, members: list[str]) -> list[str]:
        if len(set(members)) != len(members):
            raise ValueError("Each member may appear only once in the split.")
        return members


class ExactSplit(StrictModel):
    type: Literal["exact"]
    shares: dict[Username, ShareMoney] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def _shares_are_non_empty(self) -> ExactSplit:
        if not self.shares:
            raise ValueError("Choose at least one member for the split.")
        return self


Split = Annotated[EqualSplit | ExactSplit, Field(discriminator="type")]


class ExpenseCreate(StrictModel):
    description: Description
    paid_by: Username
    amount: Money
    split: Split


class ExpenseOut(StrictModel):
    id: int
    group_id: int
    description: str
    amount: MoneyOut
    paid_by: str
    split_type: Literal["equal", "exact"]
    shares: dict[str, MoneyOut]
    created_at: TimestampOut
    is_deleted: bool
    deleted_at: TimestampOut | None


class ExpenseListOut(StrictModel):
    expenses: list[ExpenseOut]
    count: int = Field(ge=0)
