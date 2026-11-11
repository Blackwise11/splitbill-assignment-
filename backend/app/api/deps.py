"""Shared FastAPI dependencies for identity and group access."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.models import Group
from app.services.groups import require_group_member, require_user

DbSession = Annotated[Session, Depends(get_db)]


def get_current_username(
    session: DbSession,
    x_user: Annotated[
        str | None,
        Header(
            alias="X-User",
            description="Acting username: alice, bob, carol, or dan.",
        ),
    ] = None,
) -> str:
    """Resolve the acting user from the X-User header."""
    if x_user is None or not x_user.strip():
        raise UnauthorizedError(
            "X-User header is required. Send one of: alice, bob, carol, dan.",
            code="missing_x_user",
        )
    username = x_user.strip()
    require_user(session, username)
    return username


CurrentUser = Annotated[str, Depends(get_current_username)]


def require_group_access(
    group_id: int,
    session: DbSession,
    username: CurrentUser,
) -> Group:
    """Load a group and enforce membership (403) after existence (404)."""
    return require_group_member(session, group_id, username)


GroupAccess = Annotated[Group, Depends(require_group_access)]
