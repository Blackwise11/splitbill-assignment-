"""Balance and settlement response schemas."""

from __future__ import annotations

from pydantic import Field

from app.schemas.groups import StrictModel
from app.schemas.money import MoneyOut


class BalanceLineOut(StrictModel):
    username: str
    paid: MoneyOut
    owed: MoneyOut
    balance: MoneyOut


class BalancesOut(StrictModel):
    group_id: int
    currency: str = "THB"
    members: list[BalanceLineOut]
    total: MoneyOut


class TransferOut(StrictModel):
    from_user: str
    to_user: str
    amount: MoneyOut


class SettleUpOut(StrictModel):
    group_id: int
    currency: str = "THB"
    transactions: list[TransferOut]
    transaction_count: int = Field(ge=0)
