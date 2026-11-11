"""Group access rules and read models."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.models import Group, User
from app.repositories import groups as group_repository
from app.schemas.groups import GroupOut


def require_user(session: Session, username: str) -> User:
    user = session.get(User, username)
    if user is None:
        raise UnauthorizedError(
            f"Unknown user {username!r}. Use one of alice, bob, carol, or dan.",
            code="unknown_user",
        )
    return user


def require_group_member(session: Session, group_id: int, username: str) -> Group:
    """Return the group or fail with 404/403 while preserving the access boundary."""
    group = group_repository.get_group(session, group_id)
    if group is None:
        raise NotFoundError("Group not found.", code="group_not_found")
    if not group_repository.is_member(session, group_id, username):
        raise ForbiddenError(
            "You are not a member of this group.",
            code="not_group_member",
        )
    return group


def list_user_groups(session: Session, username: str) -> list[Group]:
    require_user(session, username)
    return group_repository.list_groups_for_user(session, username)


def group_to_out(group: Group) -> GroupOut:
    members = group.member_usernames
    return GroupOut(id=group.id, name=group.name, members=members, member_count=len(members))
