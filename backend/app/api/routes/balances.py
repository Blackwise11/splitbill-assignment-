"""Balance and settle-up endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession, GroupAccess
from app.schemas.balances import BalancesOut, SettleUpOut
from app.services.balances_service import build_balance_report, build_settlement
from app.services.serializers import balances_to_out, transfers_to_out

router = APIRouter(tags=["balances"])


@router.get(
    "/groups/{group_id}/balances",
    response_model=BalancesOut,
    summary="Zero-sum net balances for every member",
)
def get_balances(group: GroupAccess, session: DbSession) -> BalancesOut:
    report = build_balance_report(session, group)
    return balances_to_out(group.id, report)


@router.get(
    "/groups/{group_id}/settle-up",
    response_model=SettleUpOut,
    summary="Greedy minimum-cash-flow settlement suggestions",
)
def get_settle_up(group: GroupAccess, session: DbSession) -> SettleUpOut:
    return transfers_to_out(group.id, build_settlement(session, group))
