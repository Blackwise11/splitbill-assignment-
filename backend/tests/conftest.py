"""Pytest fixtures: a fresh database and seeded API client per test."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from app.core.database import create_db_engine, get_db
from app.main import app
from app.models import Base, Group, GroupMember, User
from fastapi.testclient import TestClient
from sqlalchemy import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

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


@pytest.fixture()
def database_path(tmp_path: Path) -> Path:
    return tmp_path / "splitbill_test.db"


@pytest.fixture()
def engine(database_path: Path) -> Iterator[Engine]:
    """Use TEST_DATABASE_URL when supplied, otherwise a hermetic SQLite file."""
    test_url = os.getenv("TEST_DATABASE_URL")
    if test_url:
        url = make_url(test_url)
        if url.get_backend_name().startswith("postgres") and not (url.database or "").endswith(
            "_test"
        ):
            raise RuntimeError(
                "TEST_DATABASE_URL must point to a PostgreSQL database whose name ends in '_test'."
            )
        database_engine = create_db_engine(test_url)
        Base.metadata.drop_all(database_engine)
        Base.metadata.create_all(database_engine)
        try:
            yield database_engine
        finally:
            Base.metadata.drop_all(database_engine)
            database_engine.dispose()
        return

    database_engine = create_db_engine(f"sqlite+pysqlite:///{database_path.as_posix()}")
    Base.metadata.create_all(database_engine)
    try:
        yield database_engine
    finally:
        Base.metadata.drop_all(database_engine)
        database_engine.dispose()


@pytest.fixture()
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db_session(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def seeded(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        for username, display_name in USERS.items():
            session.add(User(username=username, display_name=display_name))
        session.flush()
        for group_id, (name, members) in GROUPS.items():
            session.add(Group(id=group_id, name=name))
            session.flush()
            for username in members:
                session.add(GroupMember(group_id=group_id, username=username))
        session.commit()


@pytest.fixture()
def client(session_factory: sessionmaker[Session], seeded: None) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth(user: str) -> dict[str, str]:
    return {"X-User": user}
