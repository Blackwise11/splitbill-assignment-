"""Seed script idempotency tests."""

from app.models import Group, GroupMember, User
from app.seed import seed_database
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker


def test_seed_is_idempotent_and_contains_required_data(
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        seed_database(session)
    with session_factory() as session:
        seed_database(session)

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(User)) == 4
        assert session.scalar(select(func.count()).select_from(Group)) == 2
        assert session.scalar(select(func.count()).select_from(GroupMember)) == 5
        assert session.get(Group, 1).name == "Chiang Mai trip"
        assert session.get(Group, 2).name == "Office lunch"
