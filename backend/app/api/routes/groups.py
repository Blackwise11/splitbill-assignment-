"""Group endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, GroupAccess
from app.schemas.groups import GroupOut
from app.services.groups import group_to_out, list_user_groups

router = APIRouter(tags=["groups"])


@router.get("/groups", response_model=list[GroupOut], summary="List my groups")
def get_groups(session: DbSession, username: CurrentUser) -> list[GroupOut]:
    return [group_to_out(group) for group in list_user_groups(session, username)]


@router.get("/groups/{group_id}", response_model=GroupOut, summary="Get a group")
def get_group(group: GroupAccess) -> GroupOut:
    return group_to_out(group)
