"""Data access for groups and memberships."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Group, GroupMember


def get_group(session: Session, group_id: int) -> Group | None:
    return session.get(Group, group_id)


def list_groups_for_user(session: Session, username: str) -> list[Group]:
    statement = (
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.username == username)
        .order_by(Group.id)
    )
    return list(session.scalars(statement).unique())


def is_member(session: Session, group_id: int, username: str) -> bool:
    return session.get(GroupMember, (group_id, username)) is not None
