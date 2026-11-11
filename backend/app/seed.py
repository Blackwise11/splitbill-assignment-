"""Idempotent reference-data seed for local development and Docker."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Group, GroupMember, User

logger = logging.getLogger(__name__)

USERS = {
    "alice": "Alice",
    "bob": "Bob",
    "carol": "Carol",
    "dan": "Dan",
}

GROUPS = {
    1: ("Chiang Mai trip", ["alice", "bob", "carol"]),
    2: ("Office lunch", ["bob", "dan"]),
}


def seed_database(session: Session) -> None:
    """Insert the assessment's users and groups without creating duplicates."""
    for username, display_name in USERS.items():
        user = session.get(User, username)
        if user is None:
            session.add(User(username=username, display_name=display_name))
        else:
            user.display_name = display_name

    session.flush()

    for group_id, (name, members) in GROUPS.items():
        group = session.get(Group, group_id)
        if group is None:
            group = Group(id=group_id, name=name)
            session.add(group)
            session.flush()
        else:
            group.name = name

        existing = {membership.username for membership in group.memberships}
        for username in members:
            if username not in existing:
                session.add(GroupMember(group_id=group_id, username=username))
        session.flush()

    _advance_postgres_sequence(session)
    session.commit()


def _advance_postgres_sequence(session: Session) -> None:
    """Keep the groups identity sequence ahead of explicitly seeded IDs."""
    bind = session.get_bind()
    if bind.dialect.name != "postgresql":
        return
    session.execute(
        text(
            "SELECT setval("
            "pg_get_serial_sequence('groups', 'id'), "
            "GREATEST((SELECT COALESCE(MAX(id), 1) FROM groups), 1)"
            ")"
        )
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with SessionLocal() as session:
        seed_database(session)
    logger.info("Seed complete: users=%s groups=%s", list(USERS), list(GROUPS))


if __name__ == "__main__":
    main()
